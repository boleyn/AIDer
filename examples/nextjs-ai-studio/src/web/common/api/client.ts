import { TOKEN_ERROR_CODE } from '@/global/common/error/errorCode';
import { getNanoid } from '@/global/common/string/tools';
import { ZodError } from 'zod';
import { getWebReqUrl, subRoute } from '@/web/common/system/utils';
import { TeamErrEnum } from '@/global/common/error/code/team';
import { useSystemStore } from '../system/useSystemStore';
import { clearToken } from '@/web/support/user/auth';
import { safeEncodeURIComponent } from '@/web/common/utils/uri';

const responseError = (err: any) => {
  console.log('error->', '请求错误', err);
  const isOutlinkPage =
    {
      [`${subRoute}/chat/share`]: true,
      [`${subRoute}/chat`]: true,
      [`${subRoute}/login`]: true
    }[window.location.pathname] || window.location.pathname.startsWith(`${subRoute}/s/`);

  const data = err?.response?.data || err;

  if (!err) {
    return Promise.reject({ message: '未知错误' });
  }
  if (typeof err === 'string') {
    return Promise.reject({ message: err });
  }
  if (typeof data === 'string') {
    return Promise.reject(data);
  }

  // 有报错响应 - 支持 shouldClearToken 字段或 TOKEN_ERROR_CODE
  if (data?.shouldClearToken || data?.code in TOKEN_ERROR_CODE) {
    if (!isOutlinkPage) {
      clearToken();
      window.location.replace(
        getWebReqUrl(
          `/login?lastRoute=${safeEncodeURIComponent(location.pathname + location.search)}`
        )
      );
    }

    return Promise.reject({ message: '登录已过期，请重新登录' });
  }
  if (
    data?.statusText &&
    [
      TeamErrEnum.aiPointsNotEnough,
      TeamErrEnum.datasetSizeNotEnough,
      TeamErrEnum.datasetAmountNotEnough,
      TeamErrEnum.appAmountNotEnough,
      TeamErrEnum.pluginAmountNotEnough,
      TeamErrEnum.websiteSyncNotEnough,
      TeamErrEnum.reRankNotEnough
    ].includes(data?.statusText) &&
    !isOutlinkPage
  ) {
    useSystemStore.getState().setNotSufficientModalType(data.statusText);
    return Promise.reject(data);
  }
  return Promise.reject(data);
};
