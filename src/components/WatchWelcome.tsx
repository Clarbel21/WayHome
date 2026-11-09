import { Flower2, House, Phone } from "lucide-react";
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
  const { touches, reply, hello } = useMascotInteraction(
    page === "idle" ? 0 : 1,
  );
  function greet() {
    hello();
    onPage("welcome");
  }
  if (page === "help")
    return (
      <div className="watch-help-home">
        <h2>{t("howHelp")}</h2>
        <div className="watch-visual-choices">
          <button
            className="watch-picture-card home"
            aria-label={t("goHome")}
            onClick={() => s.chooseAssistance("home")}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              <House size={38} strokeWidth={1.7} />
            </span>
            <span>{id ? "Pulang" : "Help me home"}</span>
          </button>
          <button
            className="watch-picture-card family"
            onClick={() => s.chooseAssistance("family")}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              <span className="trusted-initial">{s.settings.caregiver[0]}</span>
              <Phone size={17} />
            </span>
            <span>
              {t("callPerson", { name: s.settings.caregiver.split(" ")[0] })}
            </span>
          </button>
        </div>
      </div>
    );
  return (
    <div
      className={
        "watch-welcome watch-welcome-" +
        page +
        (touches ? " mascot-touched" : "")
      }
    >
      <button
        className="mascot-touch"
        aria-label={
          page === "idle"
            ? (id ? "Sapa " : "Say hello to ") + s.settings.companionName
            : (id ? "Bicara dengan " : "Talk with ") + s.settings.companionName
        }
        onClick={greet}
        data-caregiver-skip-notification="true"
      >
        <Sprout key={touches} />
      </button>
      <div className="watch-sentence-slot">
        {page === "idle" ? (
          <h2>{t("watchHello", { name: s.settings.wearer.split(" ")[0] })}</h2>
        ) : (
          <p className="watch-greeting" role="status">
            {reply}
          </p>
        )}
      </div>
      <div
        className={page === "idle" ? "watch-choice-space" : ""}
        inert={page === "idle"}
        aria-hidden={page === "idle"}
      >
        <div className="watch-visual-choices">
          <button
            className="watch-picture-card memories"
            aria-label={t("memories")}
            onClick={onMemories}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              <Flower2 size={34} strokeWidth={1.6} />
            </span>
            <span>{id ? "Kenangan" : "Memories"}</span>
          </button>
          <button
            className="watch-picture-card help"
            aria-label={t("needHelp")}
            onClick={() => onPage("help")}
          >
            <span className="watch-picture-symbol" aria-hidden="true">
              <House size={34} strokeWidth={1.6} />
            </span>
            <span>{id ? "Bantuan" : "Some help"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
