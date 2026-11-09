import { ArrowRight, Flower2, House, MessageCircle, Phone } from "lucide-react";
import { Sprout } from "./Sprout";
import { useMascotInteraction } from "./WatchMascot";
import { useStore } from "../store";
import { useLang, useT } from "../i18n";

export type WelcomePage = "idle" | "welcome" | "help";

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
  const dialogue = mode === "dialogue";
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
    <div
      className={`watch-welcome watch-welcome-${page} mode-home-${mode} ${help ? "watch-help-home" : ""} ${touches ? "mascot-touched" : ""}`}
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
          hello();
          if (mode === "normal" && !help) onPage("welcome");
        }}
        data-caregiver-skip-notification="true"
      >
        <Sprout key={touches} />
      </button>
      <div
        className={`watch-sentence-slot ${dialogue ? "watch-dialogue-bubble" : ""}`}
      >
        {touches ? (
          <p className="watch-greeting" role="status">
            {reply}
          </p>
        ) : (
          <h2>{heading}</h2>
        )}
      </div>
      {focus ? (
        <div className="watch-focus-actions">
          <button
            className="watch-focus-primary"
            onClick={() => s.chooseAssistance("home")}
          >
            <House size={27} strokeWidth={1.8} />
            <span>{t("goHome")}</span>
            <ArrowRight size={21} />
          </button>
          <button
            className="watch-more-button"
            onClick={() => onPage("welcome")}
          >
            {id ? "Pilihan lainnya" : "More choices"}
          </button>
        </div>
      ) : (
        <div className="watch-visual-choices">
          <button
            className={`watch-picture-card ${help ? "home" : "memories"}`}
            aria-label={help ? t("goHome") : t("memories")}
            onClick={help ? () => s.chooseAssistance("home") : onMemories}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              {help ? (
                <House size={28} strokeWidth={1.7} />
              ) : (
                <Flower2 size={28} strokeWidth={1.7} />
              )}
            </span>
            <span>
              {help
                ? id
                  ? "Pulang"
                  : "Help me home"
                : dialogue
                  ? id
                    ? "Lihat kenangan"
                    : "See my memories"
                  : id
                    ? "Kenangan"
                    : "Memories"}
            </span>
          </button>
          <button
            className={`watch-picture-card ${help ? "family" : "help"}`}
            aria-label={
              help
                ? t("callPerson", { name: s.settings.caregiver.split(" ")[0] })
                : t("needHelp")
            }
            onClick={
              help ? () => s.chooseAssistance("family") : () => onPage("help")
            }
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              {help ? (
                <Phone size={26} strokeWidth={1.7} />
              ) : (
                <MessageCircle size={28} strokeWidth={1.7} />
              )}
            </span>
            <span>
              {help
                ? t("callPerson", { name: s.settings.caregiver.split(" ")[0] })
                : dialogue
                  ? id
                    ? "Aku perlu bantuan"
                    : "I need some help"
                  : id
                    ? "Bantuan"
                    : "Some help"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
