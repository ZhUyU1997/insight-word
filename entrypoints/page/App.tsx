import classnames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import tinycolor from "tinycolor2";
import { logger } from "../common/logger";
import EventEmitter from "eventemitter3";
import { getTranslation } from "./translate";
import "./App.less";
import useEventCallback from "./use-event-callback";
import { Helper } from "./helper";
import { Highlight } from "./highlight";

export const WordEvent = new EventEmitter<"mouseenter" | "mouseleave">();

function isLightColor(color: string) {
  return tinycolor(color).isLight();
}

type Config = {
  theme: "dark" | "light";
  style: React.CSSProperties;
};

function calcConfig(
  word: HTMLElement,
  popup: HTMLElement,
  content: HTMLElement,
  translation: string
): Config {
  const { x, y, width, height } = word.getBoundingClientRect();
  const X = x;
  const Y = y;

  content.textContent = translation;

  popup.style.left = `${X.toFixed()}px`;
  popup.style.right = `unset`;
  popup.style.top = `${(Y + height + 0).toFixed()}px`;
  popup.classList.add("show");

  const {
    x: popupX,
    y: popupY,
    width: popupWidth,
    height: popupHeight,
  } = popup.getBoundingClientRect();

  const docWidth =
    document.documentElement.clientWidth || document.body.clientWidth;
  const docHeight =
    document.documentElement.clientHeight || document.body.clientHeight;
  const isLightFontColor = isLightColor(
    getComputedStyle(word).getPropertyValue("color")
  );

  const theme = isLightFontColor ? "dark" : "light";
  popup.classList.toggle("dark", isLightFontColor);
  popup.classList.toggle("light", !isLightFontColor);

  if (Math.abs(popupX + popupWidth - docWidth) <= 2) {
    popup.style.left = `unset`;
    popup.style.right = `0px`;
  }

  if (popupY + popupHeight > docHeight - 2) {
    popup.style.top = `${(Y - popupHeight - 5).toFixed()}px`;
  }

  return {
    theme,
    style: {
      left: popup.style.left,
      right: popup.style.right,
      top: popup.style.top,
    },
  };
}

export function useCancelableTimeoutCallback(
  callback: () => void,
  delay: number
) {
  const ref = useRef<ReturnType<typeof setTimeout>>();
  const _callback = useEventCallback(callback);
  const trigger = useEventCallback(() => {
    clearTimeout(ref.current);
    const id = setTimeout(() => {
      _callback();
    }, delay);

    ref.current = id;
  });

  const cancel = useCallback(() => {
    clearTimeout(ref.current);
  }, []);

  const execute = useCallback(() => {
    clearTimeout(ref.current);
    _callback();
  }, []);

  return { trigger, cancel, execute };
}

function IsWordOnScreen(el: HTMLElement) {
  const { x, y, width, height } = el.getBoundingClientRect();
  if (width === 0 || height === 0) return false;

  const docWidth =
    document.documentElement.clientWidth || document.body.clientWidth;
  const docHeight =
    document.documentElement.clientHeight || document.body.clientHeight;

  if (x >= docWidth || x + width <= 0) return false;
  if (y >= docHeight || y + height <= 0) return false;

  return true;
}

export function App() {
  const [show, setShow] = useState(false);
  const [content, setContent] = useState("");
  const [lemma, setLemma] = useState("");
  const wordRef = useRef<HTMLElement>();
  const {
    trigger: triggerHide,
    cancel,
    execute,
  } = useCancelableTimeoutCallback(() => {
    console.log("hide");
    wordRef.current = undefined;
    setShow(false);
  }, 100);
  const popupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<Config>(() => ({
    theme: "dark",
    style: {},
  }));
  useEffect(() => {
    async function showTranslation(el: HTMLElement, word: string) {
      const translation =
        (await getTranslation(el.textContent ?? "")) ?? "点击跳转谷歌翻译";
      logger.log(`showTranslation [${translation}]`);

      setLemma(el.dataset.lemma ?? "");
      if (popupRef.current && contentRef.current) {
        wordRef.current = el;
        const config = calcConfig(
          el,
          popupRef.current,
          contentRef.current,
          translation
        );

        setShow(true);
        setConfig(config);
        setContent(translation);
      }
    }
    function onMouseEnter(e: MouseEvent) {
      const el = e.target as HTMLElement;
      logger.log("mouseenter", el);

      if (!Highlight.isClickable(el.classList)) return;
      cancel();
      showTranslation(el, el.textContent ?? "");
    }

    function onMouseLeave(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!Highlight.isClickable(el.classList)) return;
      triggerHide();
    }

    function onWheel() {
      execute();
    }

    WordEvent.addListener("mouseenter", onMouseEnter);
    WordEvent.addListener("mouseleave", onMouseLeave);

    document.addEventListener("wheel", onWheel);
    return () => {
      WordEvent.removeListener("mouseenter", onMouseEnter);
      WordEvent.removeListener("mouseleave", onMouseLeave);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);
  return (
    <div
      ref={popupRef}
      className={classnames(
        "insight-word-popup",
        Highlight.IGNORE_CLASS,
        show ? "show" : "hide",
        config.theme
      )}
      style={{
        ...config.style,
      }}
      onMouseOut={() => {
        triggerHide();
      }}
      onMouseOver={() => {
        if (wordRef.current) {
          const isOn = IsWordOnScreen(wordRef.current);
          logger.log("############# IsWordOnScreen", isOn);
          if (!isOn) {
            wordRef.current.classList.add(Highlight.IGNORE_CLASS);
            logger.log("“单词洞察力”发现交互异常，已帮您移除单词");
            execute();
            return;
          }
        }

        cancel();
      }}
    >
      <div className={classnames(Highlight.IGNORE_CLASS, "operator")}>
        <div
          className={classnames(Highlight.IGNORE_CLASS, "delete")}
          onClick={() => {
            if (lemma) {
              Helper.ignoreWord(lemma);
            }
            execute();
          }}
        >
          忽略
        </div>
      </div>
      <p className={classnames(Highlight.IGNORE_CLASS)} ref={contentRef}>
        {content}
      </p>
    </div>
  );
}
