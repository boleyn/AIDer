import * as React from "react";

import { useSandpack } from "../../hooks";
import {
  useLoadingOverlayState,
  FADE_ANIMATION_DURATION,
} from "../../hooks/useLoadingOverlayState";
import { useSandpackPreviewProgress } from "../../hooks/useSandpackPreviewProgress";
import { useSandpackShellStdout } from "../../hooks/useSandpackShellStdout";
import { css } from "../../styles";
import {
  absoluteClassName,
  buttonClassName,
  errorBundlerClassName,
  errorClassName,
  errorMessageClassName,
  fadeIn,
  iconStandaloneClassName,
  roundedButtonClassName,
} from "../../styles/shared";
import { useClassNames } from "../../utils/classNames";
import { StdoutList } from "../Console/StdoutList";
import { RestartIcon } from "../icons";

import { Loading } from "./Loading";

export interface LoadingOverlayProps {
  clientId?: string;

  /**
   * It enforces keeping the loading state visible,
   * which is helpful for external loading states.
   */
  loading?: boolean;

  showOpenInCodeSandbox: boolean;
}

const loadingClassName = css({
  backgroundColor: "$colors$surface1",
});

export const LoadingOverlay: React.FC<
  LoadingOverlayProps & React.HTMLAttributes<HTMLDivElement>
> = ({
  clientId,
  loading,
  className,
  style,
  showOpenInCodeSandbox,
  ...props
}): JSX.Element | null => {
  const classNames = useClassNames();
  const {
    sandpack: { runSandpack, environment },
  } = useSandpack();
  const [shouldShowStdout, setShouldShowStdout] = React.useState(false);

  const loadingOverlayState = useLoadingOverlayState(clientId, loading);
  const progressMessage = useSandpackPreviewProgress({ clientId });
  const { logs: stdoutData } = useSandpackShellStdout({ clientId });

  React.useEffect(() => {
    let timer: NodeJS.Timer;
    if (progressMessage?.includes("Running")) {
      timer = setTimeout(() => {
        setShouldShowStdout(true);
      }, 3_000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [progressMessage]);

  if (loadingOverlayState === "HIDDEN") {
    return null;
  }

  if (loadingOverlayState === "TIMEOUT") {
    return (
      <div
        className={classNames("overlay", [
          classNames("error"),
          absoluteClassName,
          errorClassName,
          errorBundlerClassName,
          className,
        ])}
        {...props}
      >
        <div className={classNames("error-message", [errorMessageClassName])}>
          <p
            className={classNames("error-title", [css({ fontWeight: "bold" })])}
          >
            无法连接到服务器
          </p>

          <div className={classNames("error-message", [errorMessageClassName])}>
            <p>
              这意味着 sandpack 无法连接到运行时，或者您的网络出现了问题。
              请检查浏览器中的网络标签页并重试。如果问题持续存在，请通过{" "}
              <a href="mailto:hello@codesandbox.io?subject=Sandpack Timeout Error">
                电子邮件
              </a>{" "}
              报告或提交问题到{" "}
              <a
                href="https://github.com/codesandbox/sandpack/issues"
                rel="noreferrer noopener"
                target="_blank"
              >
                GitHub。
              </a>
            </p>
          </div>

          <p
            className={classNames("error-message", [
              errorMessageClassName({ errorCode: true }),
            ])}
          >
            环境: {environment}
            <br />
            错误: 超时
          </p>

          <div>
            <button
              className={classNames("button", [
                classNames("icon-standalone"),
                buttonClassName,
                iconStandaloneClassName,
                roundedButtonClassName,
              ])}
              onClick={runSandpack}
              title="重启脚本"
              type="button"
            >
              <RestartIcon /> <span>重试</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stillLoading =
    loadingOverlayState === "LOADING" || loadingOverlayState === "PRE_FADING";

  return (
    <>
      <div
        className={classNames("overlay", [
          classNames("loading"),
          absoluteClassName,
          loadingClassName,
          className,
        ])}
        style={{
          ...style,
          opacity: stillLoading ? 1 : 0,
          transition: `opacity ${FADE_ANIMATION_DURATION}ms ease-out`,
        }}
        {...props}
      >
        {shouldShowStdout && (
          <div className={stdoutPreview.toString()}>
            <StdoutList data={stdoutData} />
          </div>
        )}
        <Loading showOpenInCodeSandbox={showOpenInCodeSandbox} />
      </div>

      {progressMessage && (
        <div className={progressClassName.toString()}>
          <p>{progressMessage}</p>
        </div>
      )}
    </>
  );
};

const stdoutPreview = css({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: "$space$8",
  overflow: "auto",
  opacity: 0.5,
  overflowX: "hidden",
});

const progressClassName = css({
  position: "absolute",
  left: "$space$5",
  bottom: "$space$4",
  zIndex: "$top",
  color: "$colors$clickable",
  animation: `${fadeIn} 150ms ease`,
  fontFamily: "$font$mono",
  fontSize: ".8em",
  width: "75%",
  p: {
    whiteSpace: "nowrap",
    margin: 0,
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
});
