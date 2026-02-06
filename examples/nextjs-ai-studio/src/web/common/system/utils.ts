import {
  type EmbeddingModelItemType,
  type LLMModelItemType
} from '@/global/core/ai/model.d';
import { useSystemStore } from './useSystemStore';

export const subRoute =
  (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.basePath) || '';

export const getWebReqUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${subRoute}${p}`;
  }
  return p;
};
import { getToken, isTokenExpired, isTokenExpiringSoon, setToken } from '@/web/support/user/token';
import { getTokenLogin } from '@/web/support/user/api';
import { clearToken } from '@/web/support/user/auth';

export const downloadFetch = async ({
  url,
  filename,
  body
}: {
  url: string;
  filename: string;
  body?: Record<string, any>;
}) => {
  if (body) {
    let token = getToken();
    if (token && isTokenExpired(token)) {
      clearToken();
      token = null;
    } else if (token && isTokenExpiringSoon(token)) {
      try {
        const user = await getTokenLogin();
        if (user && (user as any).token) {
          setToken((user as any).token);
          token = getToken();
        }
      } catch {}
    }

    // fetch data with POST method if body exists
    const response = await fetch(getWebReqUrl(url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { token } : {})
      },
      body: JSON.stringify(body)
    });

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // clean up the blob URL
    window.URL.revokeObjectURL(downloadUrl);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

export const getWebLLMModel = (model?: string) => {
  const list = useSystemStore.getState().llmModelList;
  const defaultModels = useSystemStore.getState().defaultModels;

  return list.find((item) => item.model === model || item.name === model) ?? defaultModels.llm!;
};
export const getWebDefaultLLMModel = (llmList: LLMModelItemType[] = []) => {
  const list = llmList.length > 0 ? llmList : useSystemStore.getState().llmModelList;
  const defaultModels = useSystemStore.getState().defaultModels;

  return defaultModels.llm && list.find((item) => item.model === defaultModels.llm?.model)
    ? defaultModels.llm
    : list[0];
};
export const getWebDefaultEmbeddingModel = (embeddingList: EmbeddingModelItemType[] = []) => {
  const list =
    embeddingList.length > 0 ? embeddingList : useSystemStore.getState().embeddingModelList;
  const defaultModels = useSystemStore.getState().defaultModels;

  return defaultModels.embedding &&
    list.find((item) => item.model === defaultModels.embedding?.model)
    ? defaultModels.embedding
    : list[0];
};
