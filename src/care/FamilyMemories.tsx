import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useStore,
  validWatchLine,
  type FamilyContact,
  type GameCardEdit,
} from "../store";
import { useLang, useT, translate, type TranslationKey } from "../i18n";
import { putMedia, removeMedia, useMediaURL, validMedia } from "../memory/media";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardDef {
  id: string;
  nameKey: TranslationKey;
  memoryKey: TranslationKey;
  photo: string;
}

// G1 places and G3 happy places keep their built-in names; G4 only edits the
// family line and optional photo. The drawings are always the fallback.
const PLACES: readonly CardDef[] = [
  {
    id: "garden",
    nameKey: "gameNameGarden",
    memoryKey: "gameMemoryGarden",
    photo: "/images/quiz-garden.svg",
  },
  {
    id: "bakery",
    nameKey: "gameNameBakery",
    memoryKey: "gameMemoryBakery",
    photo: "/images/quiz-bakery.svg",
  },
  {
    id: "library",
    nameKey: "gameNameLibrary",
    memoryKey: "gameMemoryLibrary",
    photo: "/images/quiz-library.svg",
  },
  {
    id: "home",
    nameKey: "gameNameHome",
    memoryKey: "gameMemoryHome",
    photo: "/images/quiz-home.svg",
  },
];

const HAPPY_PLACES: readonly CardDef[] = [
  {
    id: "beach",
    nameKey: "gameNameBeach",
    memoryKey: "gameMemoryBeach",
    photo: "/images/quiz-place-beach.svg",
  },
  {
    id: "bench",
    nameKey: "gameNameBench",
    memoryKey: "gameMemoryBench",
    photo: "/images/quiz-place-bench.svg",
  },
  {
    id: "market",
    nameKey: "gameNameMarket",
    memoryKey: "gameMemoryMarket",
    photo: "/images/quiz-place-market.svg",
  },
  {
    id: "kitchen",
    nameKey: "gameNameKitchen",
    memoryKey: "gameMemoryKitchen",
    photo: "/images/quiz-place-kitchen.svg",
  },
];

const PERSON_MEMORY: Record<string, TranslationKey> = {
  jamie: "gameMemoryJamie",
  sam: "gameMemorySam",
  mei: "gameMemoryMei",
};

function withBase(path: string) {
  return path.startsWith("/images/")
    ? `${import.meta.env.BASE_URL}${path.slice(1)}`
    : path;
}

function Preview({
  mediaId,
  fallback,
  initial,
  color,
  alt,
}: {
  mediaId?: string;
  fallback?: string;
  initial?: string;
  color?: string;
  alt: string;
}) {
  const { url } = useMediaURL(mediaId);
  if (url || fallback)
    return (
      <img
        className="cph-fm-thumb"
        src={url ?? withBase(fallback!)}
        alt={alt}
      />
    );
  return (
    <span
      className="cph-fm-thumb cph-fm-initial"
      style={{ background: color ?? "#eef5e8" }}
      aria-hidden="true"
    >
      {initial?.slice(0, 1) ?? "?"}
    </span>
  );
}

interface PhotoDraft {
  file: File | null;
  remove: boolean;
}

function PhotoField({
  label,
  removeLabel,
  fallbackLabel,
  hasPhoto,
  draft,
  onChange,
}: {
  label: string;
  removeLabel: string;
  fallbackLabel: string;
  hasPhoto: boolean;
  draft: PhotoDraft;
  onChange: (next: PhotoDraft) => void;
}) {
  return (
    <div className="cph-fm-photo-field">
      <label className="cph-fm-field">
        <span>{label}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) =>
            onChange({
              file: e.target.files?.[0] ?? null,
              remove: false,
            })
          }
        />
      </label>
      <p className="cph-fm-note">{fallbackLabel}</p>
      {hasPhoto && (
        <button
          type="button"
          className="cph-fm-remove"
          onClick={() => onChange({ file: null, remove: true })}
        >
          {removeLabel}
        </button>
      )}
    </div>
  );
}

function PersonForm({
  contact,
  fallback,
  onCancel,
  onSave,
}: {
  contact: FamilyContact;
  fallback: string;
  onCancel: () => void;
  onSave: (draft: {
    name: string;
    relation: string;
    memoryLine: string;
    file: File | null;
    removePhoto: boolean;
  }) => Promise<string | null>;
}) {
  const t = useT();
  const [name, setName] = useState(contact.name);
  const [relation, setRelation] = useState(contact.relation);
  const [line, setLine] = useState(contact.memoryLine ?? fallback);
  const [photo, setPhoto] = useState<PhotoDraft>({ file: null, remove: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const message = await onSave({
      name,
      relation,
      memoryLine: line,
      file: photo.file,
      removePhoto: photo.remove,
    });
    if (message) setError(message);
    setBusy(false);
  };
  return (
    <form className="cph-fm-form" onSubmit={submit}>
      <label className="cph-fm-field">
        <span>{t("careFamilyName")}</span>
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="cph-fm-field">
        <span>{t("careFamilyRelation")}</span>
        <input
          value={relation}
          maxLength={32}
          onChange={(e) => setRelation(e.target.value)}
        />
      </label>
      <label className="cph-fm-field">
        <span>{t("careFamilyMemoryLine")}</span>
        <input
          value={line}
          maxLength={64}
          onChange={(e) => setLine(e.target.value)}
        />
      </label>
      <p className="cph-fm-note">{t("careFamilyHint")}</p>
      <PhotoField
        label={t("careFamilyPhoto")}
        removeLabel={t("careFamilyRemovePhoto")}
        fallbackLabel={t("careFamilyFallback")}
        hasPhoto={!!contact.photoId && !photo.remove}
        draft={photo}
        onChange={setPhoto}
      />
      {error && (
        <p className="cph-fm-error" role="alert">
          {error}
        </p>
      )}
      <div className="cph-fm-actions">
        <button type="submit" className="cph-fm-save" disabled={busy}>
          {t("careFamilySave")}
        </button>
        <button type="button" className="cph-fm-cancel" onClick={onCancel}>
          {t("careFamilyCancel")}
        </button>
      </div>
    </form>
  );
}

function PlaceForm({
  edit,
  fallback,
  onCancel,
  onSave,
}: {
  edit: GameCardEdit;
  fallback: string;
  onCancel: () => void;
  onSave: (draft: {
    memoryLine: string;
    file: File | null;
    removePhoto: boolean;
  }) => Promise<string | null>;
}) {
  const t = useT();
  const [line, setLine] = useState(edit.memoryLine ?? fallback);
  const [photo, setPhoto] = useState<PhotoDraft>({ file: null, remove: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const message = await onSave({
      memoryLine: line,
      file: photo.file,
      removePhoto: photo.remove,
    });
    if (message) setError(message);
    setBusy(false);
  };
  return (
    <form className="cph-fm-form" onSubmit={submit}>
      <label className="cph-fm-field">
        <span>{t("careFamilyMemoryLine")}</span>
        <input
          value={line}
          maxLength={64}
          onChange={(e) => setLine(e.target.value)}
        />
      </label>
      <p className="cph-fm-note">{t("careFamilyHint")}</p>
      <PhotoField
        label={t("careFamilyPhoto")}
        removeLabel={t("careFamilyRemovePhoto")}
        fallbackLabel={t("careFamilyFallback")}
        hasPhoto={!!edit.photoId && !photo.remove}
        draft={photo}
        onChange={setPhoto}
      />
      {error && (
        <p className="cph-fm-error" role="alert">
          {error}
        </p>
      )}
      <div className="cph-fm-actions">
        <button type="submit" className="cph-fm-save" disabled={busy}>
          {t("careFamilySave")}
        </button>
        <button type="button" className="cph-fm-cancel" onClick={onCancel}>
          {t("careFamilyCancel")}
        </button>
      </div>
    </form>
  );
}

function Row({
  open,
  onToggle,
  thumb,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  thumb: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = useT();
  const rowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open)
      rowRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
  }, [open]);
  return (
    <article ref={rowRef} className={`cph-fm-row${open ? " is-open" : ""}`}>
      <div className="cph-fm-row-head">
        {thumb}
        <div className="cph-fm-row-copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
        <button
          type="button"
          className="cph-fm-edit"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? <ChevronLeft size={16} /> : t("careFamilyEdit")}
          {!open && <ChevronRight size={16} />}
        </button>
      </div>
      {open && children}
    </article>
  );
}

/**
 * G4 — the caregiver phone edits the people and places the web watch uses.
 * Cards stay calm and scannable; one row opens at a time. Uploads use the
 * Memory library's IndexedDB media store, while the built-in drawings remain
 * the fallback on every watch card.
 */
export function FamilyMemories() {
  const s = useStore();
  const t = useT();
  const lang = useLang((l) => l.lang);
  const [tab, setTab] = useState<"people" | "places">("people");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const savePerson = async (
    id: string,
    draft: {
      name: string;
      relation: string;
      memoryLine: string;
      file: File | null;
      removePhoto: boolean;
    },
  ) => {
    const contact = s.familyContacts.find((c) => c.id === id);
    if (!contact) return t("careFamilyErrorName");
    const name = draft.name.trim();
    const relation = draft.relation.trim();
    const line = draft.memoryLine.trim();
    if (!name || name.length > 24) return t("careFamilyErrorName");
    if (!relation || relation.length > 32) return t("careFamilyErrorRelation");
    if (line && !validWatchLine(line)) return t("careFamilyErrorLine");
    if (
      s.familyContacts.some(
        (c) =>
          c.id !== id && c.name.trim().toLowerCase() === name.toLowerCase(),
      )
    )
      return t("careFamilyErrorDuplicate");

    let photoId: string | null | undefined;
    if (draft.file) {
      try {
        validMedia(draft.file, "image");
        const mediaId = crypto.randomUUID();
        await putMedia(mediaId, draft.file);
        photoId = mediaId;
      } catch {
        return t("careFamilyErrorPhoto");
      }
    } else if (draft.removePhoto) photoId = null;

    const ok = s.updateFamilyContact(id, {
      name,
      relation,
      memoryLine: line,
      photoId,
    });
    if (!ok) {
      if (typeof photoId === "string") void removeMedia(photoId);
      return t("careFamilyErrorName");
    }
    if (contact.photoId && contact.photoId !== photoId) void removeMedia(contact.photoId);
    setNotice(t("careFamilySaved"));
    setOpen(null);
    return null;
  };

  const savePlace = async (
    group: "places" | "happyPlaces",
    id: string,
    draft: {
      memoryLine: string;
      file: File | null;
      removePhoto: boolean;
    },
  ) => {
    const line = draft.memoryLine.trim();
    if (line && !validWatchLine(line)) return t("careFamilyErrorLine");
    const current = s.gameEdits[group][id] ?? {};
    let photoId: string | null | undefined;
    if (draft.file) {
      try {
        validMedia(draft.file, "image");
        const mediaId = crypto.randomUUID();
        await putMedia(mediaId, draft.file);
        photoId = mediaId;
      } catch {
        return t("careFamilyErrorPhoto");
      }
    } else if (draft.removePhoto) photoId = null;

    if (!s.updateGameCard(group, id, { memoryLine: line, photoId })) {
      if (typeof photoId === "string") void removeMedia(photoId);
      return t("careFamilyErrorLine");
    }
    if (current.photoId && current.photoId !== photoId)
      void removeMedia(current.photoId);
    setNotice(t("careFamilySaved"));
    setOpen(null);
    return null;
  };

  const renderPlace = (card: CardDef, group: "places" | "happyPlaces") => {
    const edit = s.gameEdits[group][card.id] ?? {};
    const key = `card:${group}:${card.id}`;
    const title = translate(lang, card.nameKey);
    const line = edit.memoryLine || translate(lang, card.memoryKey);
    return (
      <Row
        key={key}
        open={open === key}
        onToggle={() => setOpen(open === key ? null : key)}
        thumb={
          <Preview
            mediaId={edit.photoId}
            fallback={card.photo}
            alt={title}
          />
        }
        title={title}
        subtitle={line}
      >
        <PlaceForm
          edit={edit}
          fallback={translate(lang, card.memoryKey)}
          onCancel={() => setOpen(null)}
          onSave={(draft) => savePlace(group, card.id, draft)}
        />
      </Row>
    );
  };

  return (
    <section className="cph-family" data-view="family-memories">
      <header className="cph-family-head">
        <h3>{t("careFamilyTitle")}</h3>
        <p>{t("careFamilyDetail")}</p>
      </header>
      <div className="cph-family-tabs" role="tablist" aria-label={t("careFamilyTitle")}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "people"}
          onClick={() => {
            setTab("people");
            setOpen(null);
          }}
        >
          {t("careFamilyPeople")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "places"}
          onClick={() => {
            setTab("places");
            setOpen(null);
          }}
        >
          {t("careFamilyPlaces")}
        </button>
      </div>
      {notice && (
        <p className="cph-family-notice" role="status">
          {notice}
        </p>
      )}
      {tab === "people" ? (
        <div className="cph-family-list">
          {s.familyContacts.slice(0, 3).map((c) => {
            const key = `person:${c.id}`;
            const fallback = PERSON_MEMORY[c.id]
              ? translate(lang, PERSON_MEMORY[c.id])
              : "";
            const line = c.memoryLine || fallback;
            return (
              <Row
                key={key}
                open={open === key}
                onToggle={() => setOpen(open === key ? null : key)}
                thumb={
                  <Preview
                    mediaId={c.photoId}
                    initial={c.name}
                    color={c.color}
                    alt={c.name}
                  />
                }
                title={c.name}
                subtitle={`${c.relation} · ${line}`}
              >
                <PersonForm
                  contact={c}
                  fallback={fallback}
                  onCancel={() => setOpen(null)}
                  onSave={(draft) => savePerson(c.id, draft)}
                />
              </Row>
            );
          })}
        </div>
      ) : (
        <div className="cph-family-list">
          <h4 className="cph-family-subhead">{t("careFamilyPlaces")}</h4>
          {PLACES.map((card) => renderPlace(card, "places"))}
          <h4 className="cph-family-subhead">{t("careFamilyHappyPlaces")}</h4>
          {HAPPY_PLACES.map((card) => renderPlace(card, "happyPlaces"))}
        </div>
      )}
    </section>
  );
}
