import * as React from "react";

import { useSandpack, useSandpackShell, useErrorMessage } from "../../hooks";
import { css } from "../../styles";
import {
  absoluteClassName,
  buttonClassName,
  errorClassName,
  errorBundlerClassName,
  errorMessageClassName,
  iconStandaloneClassName,
  roundedButtonClassName,
} from "../../styles/shared";
import { useClassNames } from "../../utils/classNames";
import { RestartIcon } from "../icons";

const mapBundlerErrors = (originalMessage: string): string => {
  const errorMessage = originalMessage.replace("[sandpack-client]: ", "");

  if (/process.exit/.test(errorMessage)) {
    const exitCode = errorMessage.match(/process.exit\((\d+)\)/);

    if (!exitCode) return errorMessage;

    // Crash
    if (Number(exitCode[1]) === 0) {
      return `服务器未运行，是否要重新启动？`;
    }

    return `服务器已崩溃，状态码为 ${exitCode[1]}，是否要重启服务器？`;
  }

  return errorMessage;
};

export type ErrorOverlayProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};
export const ErrorOverlay: React.FC<ErrorOverlayProps> = (props) => {
  const { children, className, ...otherProps } = props;
  const errorMessage = useErrorMessage();
  const { restart } = useSandpackShell();
  const classNames = useClassNames();
  const {
    sandpack: { runSandpack },
  } = useSandpack();

  if (!errorMessage && !children) {
    return null;
  }

  const isSandpackBundlerError = errorMessage?.startsWith("[sandpack-client]");
  const privateDependencyError = errorMessage?.includes(
    "NPM_REGISTRY_UNAUTHENTICATED_REQUEST"
  );

  if (privateDependencyError) {
    return (
      <div
        className={classNames("overlay", [
          classNames("error"),
          absoluteClassName,
          errorBundlerClassName,
          className,
        ])}
        {...props}
      >
        <p className={classNames("error-message", [errorMessageClassName])}>
          <strong>Unable to fetch required dependency.</strong>
        </p>

        <div className={classNames("error-message", [errorMessageClassName])}>
          <p>
            This error occurs when trying to access a private npm package.
            Private packages are not supported in this environment.
          </p>
        </div>
      </div>
    );
  }

  if (isSandpackBundlerError && errorMessage) {
    return (
      <div
        className={classNames("overlay", [
          classNames("error"),
          absoluteClassName,
          errorBundlerClassName,
          className,
        ])}
        {...otherProps}
      >
        <div className={classNames("error-message", [errorMessageClassName])}>
          <p
            className={classNames("error-title", [css({ fontWeight: "bold" })])}
          >
            无法连接到服务器
          </p>
          <p>{mapBundlerErrors(errorMessage)}</p>

          <div>
            <button
              className={classNames("button", [
                classNames("icon-standalone"),
                buttonClassName,
                iconStandaloneClassName,
                roundedButtonClassName,
              ])}
              onClick={() => {
                restart();
                runSandpack();
              }}
              title="重启脚本"
              type="button"
            >
              <RestartIcon /> <span>重启</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames("overlay", [
        classNames("error"),
        absoluteClassName,
        errorClassName({ solidBg: true }),
        className,
      ])}
      translate="no"
      {...otherProps}
    >
      <p className={classNames("error-message", [errorMessageClassName])}>
        <strong>出现了问题</strong>
      </p>

      <p
        className={classNames("error-message", [
          errorMessageClassName({ errorCode: true }),
        ])}
      >
        {errorMessage || children}
      </p>
    </div>
  );
};
