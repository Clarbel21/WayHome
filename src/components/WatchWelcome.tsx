import { WatchScreen } from "../watch/WatchScreen";
import { Button } from "../design/Controls";
import { useState } from "react";
import { ArrowRight, Flower2, House, Phone } from "lucide-react";
import { Sprout } from "./Sprout";
import { useMascotInteraction } from "./WatchMascot";
import { useStore } from "../store";
import { useLang, useT } from "../i18n";

export type WelcomePage = "idle" | "welcome" | "help" | "talk";

export function WatchWelcome({
  page,
  onPage,
  onMemories,
}: {
  page: WelcomePage;
  onPage: (page: WelcomePage) => void;
  onMemories: () => void;
}) {
  const s = useStore();
  const t = useT();
  const id = useLang((l) => l.lang) === "id";
  const mode = s.settings.experienceMode;
  const { touches, reply, hello } = useMascotInteraction(
    page === "welcome" && mode === "normal" ? 1 : 0,
  );
  const focus = mode === "focus" && page === "idle";
  const help = page === "help";
  const dialogue = (mode === "dialogue" && page !== "help") || page === "talk";
  const [talkReply, setTalkReply] = useState<string | null>(null);
  const [topicPage, setTopicPage] = useState(0);
  const replies = [
    { label: t("talkWhere"), text: t("talkWhereReply") },
    {
      label: t("talkWho"),
      text: t("talkWhoReply", { caregiver: s.settings.caregiver }),
    },
    { label: t("somethingComforting"), text: t("talkComfort") },
    { label: t("talkSomethingNice"), text: t("talkSomethingNiceReply") },
  ];
  const heading = help
    ? t("howHelp")
    : focus
      ? id
        ? "Satu langkah bersama."
        : "One step at a time."
      : dialogue
        ? id
          ? "Mau melakukan apa?"
          : "What would you like to do?"
        : t("watchHello", { name: s.settings.wearer.split(" ")[0] });

  return (
    <WatchScreen
      variant="home"
      className={`watch-welcome watch-welcome-${page} mode-home-${dialogue ? "dialogue" : mode} ${help ? "watch-help-home" : ""} ${touches ? "mascot-touched" : ""}`}
    >
      <button
        className="mascot-touch"
        aria-label={
          (page === "idle" && !touches
            ? id
              ? "Sapa "
              : "Say hello to "
            : id
              ? "Bicara dengan "
              : "Talk with ") + s.settings.companionName
        }
        onClick={() => {
          if (dialogue) setTalkReply(t("talkIntro"));
          else {
            hello();
            if (mode === "normal" && !help) onPage("welcome");
          }
        }}
        data-caregiver-skip-notification="true"
      >
        <Sprout key={touches} />
      </button>
      <div
        className={`watch-sentence-slot ${dialogue ? "watch-dialogue-bubble" : ""}`}
      >
        {dialogue && talkReply ? (
          <p className="watch-greeting" role="status">
            {talkReply}
          </p>
        ) : touches && !dialogue ? (
          <p className="watch-greeting" role="status">
            {reply}
          </p>
        ) : (
          <h2>{heading}</h2>
        )}
      </div>
      {focus ? (
        <div className="watch-focus-actions">
          <Button
            className="watch-focus-primary"
            onClick={() => s.chooseAssistance("home")}
          >
            <House size={27} strokeWidth={1.8} />
            <span>{t("goHome")}</span>
            <ArrowRight size={21} />
          </Button>
          <button
            className="watch-more-button"
            onClick={() => s.chooseAssistance("family")}
          >
            <Phone size={20} />{" "}
            {t("callPerson", { name: s.settings.caregiver.split(" ")[0] })}
          </button>
        </div>
      ) : dialogue ? (
        <div className="watch-dialogue-controls">
          <div className="watch-dialogue-questions">
            {replies
              .slice(topicPage * 2, topicPage * 2 + 2)
              .map(({ label, text }) => (
                <button
                  key={label}
                  className="watch-dialogue-question"
                  onClick={() => setTalkReply(text)}
                >
                  {label}
                </button>
              ))}
          </div>
          <button
            type="button"
            className="watch-more-button"
            onClick={() => setTopicPage((page) => 1 - page)}
          >
            {t(topicPage ? "previousTopics" : "moreTopics")}
          </button>
        </div>
      ) : (
        <div
          className={`watch-visual-choices ${help ? "" : "watch-direct-actions"}`}
        >
          <button
            className="watch-picture-card home"
            onClick={() => s.chooseAssistance("home")}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              <House size={24} />
            </span>
            <span>{t("goHome")}</span>
          </button>
          <button
            className={`watch-picture-card ${help ? "family" : "memories"}`}
            onClick={help ? () => s.chooseAssistance("family") : onMemories}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              {help ? <Phone size={24} /> : <Flower2 size={24} />}
            </span>
            <span>
              {help
                ? t("callPerson", { name: s.settings.caregiver.split(" ")[0] })
                : t("memories")}
            </span>
          </button>
          {help && (
            <button
              className="watch-more-button watch-talk-link"
              onClick={() => onPage("talk")}
            >
              {t("talk")}
            </button>
          )}
        </div>
      )}
    </WatchScreen>
  );
}
