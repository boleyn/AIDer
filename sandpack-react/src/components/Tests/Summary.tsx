import * as React from "react";

import { css } from "../../styles";
import { useClassNames } from "../../utils/classNames";

import {
  failTextClassName,
  passTextClassName,
  skipTextClassName,
} from "./style";

export interface TestResults {
  pass: number;
  fail: number;
  skip: number;
  total: number;
}

export interface SuiteResults {
  pass: number;
  fail: number;
  total: number;
}

interface Props {
  suites: SuiteResults;
  tests: TestResults;
  duration: number;
}

const gapBottomClassName = css({
  marginBottom: "$space$2",
});

const labelClassName = css({
  fontWeight: "bold",
  color: "$colors$hover",
  whiteSpace: "pre-wrap",
});
const containerClassName = css({
  fontWeight: "bold",
  color: "$colors$clickable",
});

export const Summary: React.FC<Props> = ({ suites, tests, duration }) => {
  const widestLabel = "测试套件: ";

  const withMargin = (label: string): string => {
    const difference = widestLabel.length - label.length;
    const margin = Array.from({ length: difference }, () => " ").join("");
    return label + margin;
  };

  const classNames = useClassNames();

  return (
    <div className={classNames("test-summary", [containerClassName])}>
      <div className={classNames("test-summary", [gapBottomClassName])}>
        <span
          className={classNames("test-summary-suites-label", [labelClassName])}
        >
          {widestLabel}
        </span>
        {suites.fail > 0 && (
          <span
            className={classNames("test-summary-suites-fail", [
              failTextClassName,
            ])}
          >
            {suites.fail} 失败,{" "}
          </span>
        )}
        {suites.pass > 0 && (
          <span
            className={classNames("test-summary-suites-pass", [
              passTextClassName,
            ])}
          >
            {suites.pass} 通过,{" "}
          </span>
        )}
        <span>{suites.total} 总计</span>
      </div>
      <div className={classNames("test-summary", [gapBottomClassName])}>
        <span className={classNames("test-summary-label", [labelClassName])}>
          {withMargin("测试:")}
        </span>
        {tests.fail > 0 && (
          <span
            className={classNames("test-summary-fail", [failTextClassName])}
          >
            {tests.fail} 失败,{" "}
          </span>
        )}
        {tests.skip > 0 && (
          <span
            className={classNames("test-summary-skip", [skipTextClassName])}
          >
            {tests.skip} 跳过,{" "}
          </span>
        )}
        {tests.pass > 0 && (
          <span
            className={classNames("test-summary-pass", [passTextClassName])}
          >
            {tests.pass} 通过,{" "}
          </span>
        )}
        <span>{tests.total} 总计</span>
      </div>
      <div className={classNames("test-summary-curation", [labelClassName])}>
        {withMargin("时间:")}
        {duration / 1000}秒
      </div>
    </div>
  );
};
