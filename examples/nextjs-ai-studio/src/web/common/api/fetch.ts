import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { getErrText } from '@fastgpt/global/common/error/utils';
import type { StartChatFnProps } from '@/components/core/chat/ChatContainer/type';
import {
  // refer to https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web
  EventStreamContentType,
  fetchEventSource
} from '@fortaine/fetch-event-source';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { useSystemStore } from '../system/useSystemStore';
import { formatTime2YMDHMW } from '@fastgpt/global/common/string/time';
import { getWebReqUrl, subRoute } from '@fastgpt/web/common/system/utils';
import { getToken, isTokenExpired, isTokenExpiringSoon, setToken } from '@/web/support/user/token';
import type { OnOptimizePromptProps } from '@/components/common/PromptEditor/OptimizerPopover';
import type { OnOptimizeCodeProps } from '@/pageComponents/app/detail/WorkflowComponents/Flow/nodes/NodeCode/Copilot';
import { OutLinkErrEnum } from '@fastgpt/global/common/error/code/outLink';
import { clearToken } from '@/web/support/user/auth';
import { getTokenLogin } from '@/web/support/user/api';

type StreamFetchProps = {
  url?: string;
  data: Record<string, any>;
  onMessage: StartChatFnProps['generatingMessage'];
  abortCtrl: AbortController;
};
export type StreamResponseType = {
  responseText: string;
};
type ResponseQueueItemType =
  | {
      event: SseResponseEventEnum.fastAnswer | SseResponseEventEnum.answer;
      text?: string;
      reasoningText?: string;
    }
  | {
      event: SseResponseEventEnum.outline;
      text?: string;
      reset?: boolean;
    }
  | { event: SseResponseEventEnum.interactive; [key: string]: any }
  | {
      event:
        | SseResponseEventEnum.toolCall
        | SseResponseEventEnum.toolParams
        | SseResponseEventEnum.toolResponse;
      [key: string]: any;
    };
class FatalError extends Error {}

const isIpHostname = (hostname: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname || '');

// token refresh lock (avoid parallel refreshes)
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

const refreshTokenIfNeeded = async (): Promise<void> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const token = getToken();
  if (!token) {
    return;
  }

  if (isTokenExpired(token)) {
    return;
  }

  if (!isTokenExpiringSoon(token)) {
    return;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const user = await getTokenLogin();
      if (user && (user as any).token) {
        setToken((user as any).token);
      }
    } catch (error) {
      clearToken();
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const globalKey = '__fastgpt_auth_redirecting';
  if ((window as any)[globalKey]) return;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath.includes('/auth/feishu/login') || currentPath.includes('/login')) {
    return;
  }

  (window as any)[globalKey] = true;

  const basePath = (window as any).__NEXT_DATA__?.basePath || '';
  let normalizedPath = currentPath;
  if (basePath && normalizedPath.startsWith(basePath)) {
    normalizedPath = normalizedPath.slice(basePath.length) || '/';
  }
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  try {
    sessionStorage.setItem('fastgpt:lastRoute', normalizedPath);
  } catch {}

  const encodedLastRoute = encodeURIComponent(normalizedPath || '/');
  const hostname = window.location.hostname || '';
  const isIpAccess = isIpHostname(hostname);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const loginPath =
    isIpAccess || isLocalhost ? `${basePath}/login` : `${basePath}/auth/feishu/login`;

  window.location.replace(`${loginPath}?lastRoute=${encodedLastRoute}`);
};

export const streamFetch = ({
  url = '/api/v2/chat/completions',
  data,
  onMessage,
  abortCtrl
}: StreamFetchProps) =>
  new Promise<StreamResponseType>(async (resolve, reject) => {
    if (data && typeof data === 'object') {
      (data as Record<string, any>).timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // First res
    const timeoutId = setTimeout(() => {
      abortCtrl.abort('Time out');
    }, 60000);

    // response data
    let responseText = '';
    let responseQueue: ResponseQueueItemType[] = [];
    let errMsg: string | undefined;
    let finished = false;

    const finish = () => {
      if (errMsg !== undefined) {
        return failedFinish();
      }
      return resolve({
        responseText
      });
    };
    const failedFinish = (err?: any) => {
      finished = true;
      reject({
        message: getErrText(err, errMsg ?? '响应过程出现异常~'),
        responseText
      });
    };

    const isAnswerEvent = (event: SseResponseEventEnum) =>
      event === SseResponseEventEnum.answer || event === SseResponseEventEnum.fastAnswer;
    // animate response to make it looks smooth
    function animateResponseText() {
      // abort message
      if (abortCtrl.signal.aborted) {
        responseQueue.forEach((item) => {
          onMessage(item);
          if (isAnswerEvent(item.event) && item.text) {
            responseText += item.text;
          }
        });
        return finish();
      }

      if (responseQueue.length > 0) {
        const fetchCount = Math.max(1, Math.round(responseQueue.length / 30));
        for (let i = 0; i < fetchCount; i++) {
          const item = responseQueue[i];
          onMessage(item);
          if (isAnswerEvent(item.event) && item.text) {
            responseText += item.text;
          }
        }

        responseQueue = responseQueue.slice(fetchCount);
      }

      if (finished && responseQueue.length === 0) {
        return finish();
      }

      requestAnimationFrame(animateResponseText);
    }
    // start animation
    animateResponseText();

    const pushDataToQueue = (data: ResponseQueueItemType) => {
      // If the document is hidden, the data is directly sent to the front end
      responseQueue.push(data);

      if (document.hidden) {
        animateResponseText();
      }
    };

    try {
      // auto complete variables
      const variables = data?.variables || {};
      variables.cTime = formatTime2YMDHMW(new Date());

      // 获取 token 并添加到请求头（含刷新与过期处理）
      let token = getToken();
      if (token && isTokenExpired(token)) {
        clearToken();
        const pathname = window.location.pathname;
        const isOutlinkPage =
          {
            [`${subRoute}/chat/share`]: true,
            [`${subRoute}/chat/expired`]: true,
            [`${subRoute}/chat/team`]: true,
            [`${subRoute}/chat/entry`]: true,
            [`${subRoute}/chat/entrySecure`]: true,
            [`${subRoute}/chat/shareSecure`]: true,
            [`${subRoute}/login`]: true
          }[pathname] || pathname.startsWith(`${subRoute}/s/`);
        const shouldRedirect =
          pathname === `${subRoute}/chat/shareSecure` ||
          pathname === `${subRoute}/chat/entrySecure` ||
          (!isOutlinkPage && pathname !== `${subRoute}/login`);
        if (shouldRedirect) {
          redirectToLogin();
          throw new Error('Token expired');
        }
        token = null;
      }

      if (token) {
        try {
          await refreshTokenIfNeeded();
          token = getToken();
        } catch {
          token = getToken();
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      if (token) {
        // 为用户登录态使用自定义头，避免与 API Key(Authorization: Bearer <apikey>) 冲突
        headers['token'] = token;
      }

      const requestData = {
        method: 'POST',
        headers,
        signal: abortCtrl.signal,
        body: JSON.stringify({
          ...data,
          variables,
          detail: true,
          stream: true,
          retainDatasetCite: data.retainDatasetCite ?? true
        })
      };

      // send request
      await fetchEventSource(getWebReqUrl(url), {
        ...requestData,
        async onopen(res) {
          clearTimeout(timeoutId);
          const contentType = res.headers.get('content-type');

          // not stream
          if (contentType?.startsWith('text/plain')) {
            return failedFinish(await res.clone().text());
          }

          // failed stream
          if (
            !res.ok ||
            !res.headers.get('content-type')?.startsWith(EventStreamContentType) ||
            res.status !== 200
          ) {
            try {
              failedFinish(await res.clone().json());
            } catch {
              const errText = await res.clone().text();
              if (!errText.startsWith('event: error')) {
                failedFinish();
              }
            }
          }
        },
        onmessage: ({ event, data }) => {
          if (data === '[DONE]') {
            return;
          }

          // parse text to json
          const parseJson = (() => {
            try {
              return JSON.parse(data);
            } catch (error) {
              return;
            }
          })();

          if (typeof parseJson !== 'object') return;

          // console.log(parseJson, event);
          if (event === SseResponseEventEnum.answer) {
            const reasoningText = parseJson.choices?.[0]?.delta?.reasoning_content || '';
            pushDataToQueue({
              event,
              reasoningText
            });

            const text = parseJson.choices?.[0]?.delta?.content || '';
            for (const item of text) {
              pushDataToQueue({
                event,
                text: item
              });
            }
          } else if (event === SseResponseEventEnum.outline) {
            const text = parseJson?.text || '';
            const reset = !!parseJson?.reset;
            pushDataToQueue({
              event,
              ...(reset ? { reset } : {}),
              ...(text ? { text } : {})
            });
          } else if (event === SseResponseEventEnum.fastAnswer) {
            const reasoningText = parseJson.choices?.[0]?.delta?.reasoning_content || '';
            pushDataToQueue({
              event,
              reasoningText
            });

            const text = parseJson.choices?.[0]?.delta?.content || '';
            pushDataToQueue({
              event,
              text
            });
          } else if (
            event === SseResponseEventEnum.toolCall ||
            event === SseResponseEventEnum.toolParams ||
            event === SseResponseEventEnum.toolResponse
          ) {
            pushDataToQueue({
              event,
              ...parseJson
            });
          } else if (event === SseResponseEventEnum.flowNodeResponse) {
            onMessage({
              event,
              nodeResponse: parseJson
            });
          } else if (event === SseResponseEventEnum.updateVariables) {
            onMessage({
              event,
              variables: parseJson
            });
          } else if (event === SseResponseEventEnum.interactive) {
            pushDataToQueue({
              event,
              ...parseJson
            });
          } else if (event === SseResponseEventEnum.paragraph) {
            onMessage({
              event,
              paragraph: parseJson
            });
          } else if (event === SseResponseEventEnum.mcpFilesystem) {
            onMessage({
              event,
              mcpFilesystem: parseJson
            });
          } else if (event === SseResponseEventEnum.scheduledTask) {
            onMessage({
              event,
              scheduledTask: parseJson
            });
          } else if (event === SseResponseEventEnum.error) {
            if (parseJson.statusText === TeamErrEnum.aiPointsNotEnough) {
              useSystemStore.getState().setNotSufficientModalType(TeamErrEnum.aiPointsNotEnough);
            }
            if (parseJson.statusText === OutLinkErrEnum.unAuthUser) {
              redirectToLogin();
            }
            // 处理 shouldClearToken 字段
            if (parseJson.shouldClearToken) {
              clearToken();
              redirectToLogin();
            }
            errMsg = getErrText(parseJson, '流响应错误');
          } else if (
            [SseResponseEventEnum.workflowDuration, SseResponseEventEnum.flowNodeStatus].includes(
              event as any
            )
          ) {
            onMessage({
              event,
              ...parseJson
            });
          } else if (event === 'entryAppSelection') {
            onMessage({
              event,
              entryAppSelection: parseJson
            });
          } else if (event === 'responseData') {
            onMessage({
              event,
              responseData: parseJson.responseData,
              newVariables: parseJson.newVariables
            });
          }
        },
        onclose() {
          finished = true;
        },
        onerror(err) {
          console.log(err, 'fetch error');
          clearTimeout(timeoutId);
          failedFinish(getErrText(err));
          throw new Error(err);
        },
        openWhenHidden: true
      });
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (abortCtrl.signal.aborted) {
        finished = true;

        return;
      }
      console.log(err, 'fetch error');

      failedFinish(err);
    }
  });

export const onOptimizePrompt = async ({
  originalPrompt,
  model,
  input,
  onResult,
  abortController
}: OnOptimizePromptProps) => {
  const controller = abortController || new AbortController();
  await streamFetch({
    url: '/api/core/ai/optimizePrompt',
    data: {
      originalPrompt,
      optimizerInput: input,
      model
    },
    onMessage: ({ event, text }) => {
      if (event === SseResponseEventEnum.answer && text) {
        onResult(text);
      }
    },
    abortCtrl: controller
  });
};

export const onOptimizeCode = async ({
  optimizerInput,
  model,
  conversationHistory = [],
  onResult,
  abortController
}: OnOptimizeCodeProps) => {
  const controller = abortController || new AbortController();
  await streamFetch({
    url: '/api/core/workflow/optimizeCode',
    data: {
      optimizerInput,
      model,
      conversationHistory
    },
    onMessage: ({ event, text }) => {
      if (event === SseResponseEventEnum.answer && text) {
        onResult(text);
      }
    },
    abortCtrl: controller
  });
};
