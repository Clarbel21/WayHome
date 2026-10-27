import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  Play,
  Plus,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import "./landing.css";

const asset = (name: string) =>
  `${import.meta.env.BASE_URL}images/product/${name}.webp`;

function Seed({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M30 54c3-14 2-25-6-34"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M28 31C13 29 9 19 11 7c14 2 23 10 17 24ZM31 40c-1-16 7-25 24-27-1 17-8 26-24 27Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.75, delay, ease: [0.2, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const forms = [
  {
    id: "wrist",
    name: "On your wrist",
    short: "Wrist",
    number: "01",
    title: "A familiar fit.",
    description:
      "For the morning walk. The afternoon coffee. The everyday moments that are yours. A soft band brings the same WayHome core to your wrist.",
    detail: "Wristband concept",
    alt: "Silver WayHome core with a mint sprout on its screen, attached to a sage green wristband",
  },
  {
    id: "pendant",
    name: "Close to your heart",
    short: "Pendant",
    number: "02",
    title: "A personal touch.",
    description:
      "Something familiar to carry with you. A simple pendant lets WayHome become part of what you love to wear, with the same companion at its heart.",
    detail: "Necklace & pendant concept",
    alt: "The same silver WayHome core suspended from a sage cord in a pendant setting",
  },
  {
    id: "clip",
    name: "Along for the day",
    short: "Clip",
    number: "03",
    title: "A little flexibility.",
    description:
      "On a favourite jacket or a comfortable layer. A discreet clip offers another way to keep your companion close, with your wrist free.",
    detail: "Clothing clip concept",
    alt: "The same silver WayHome core with a discreet curved clothing clip visible behind it",
  },
];

function WaysToWear() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = forms[selected];
  function onKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % forms.length;
    else if (event.key === "ArrowLeft")
      next = (index + forms.length - 1) % forms.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = forms.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return (
    <section
      id="ways-to-wear"
      className="wh-wear wh-section"
      aria-labelledby="wear-title"
    >
      <Reveal className="wh-section-top">
        <div>
          <p className="wh-eyebrow">ONE CORE. YOUR CHOICE.</p>
          <h2 id="wear-title" tabIndex={-1}>
            Wear it your way.
          </h2>
        </div>
        <p className="wh-section-intro">
          Your routines. Your preferences.
          <br />
          One companion that fits around you.
        </p>
      </Reveal>
      <Reveal>
        <div
          className="wh-wear-tabs"
          role="tablist"
          aria-label="Ways to wear WayHome"
        >
          {forms.map((form, index) => (
            <button
              key={form.id}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              id={`wear-tab-${form.id}`}
              role="tab"
              aria-selected={index === selected}
              aria-controls="wear-panel"
              tabIndex={index === selected ? 0 : -1}
              onKeyDown={(e) => onKeys(e, index)}
              onClick={() => setSelected(index)}
            >
              <span className="wh-tab-number">{form.number}</span>
              {form.short}
              <span className="wh-tab-dot" />
            </button>
          ))}
        </div>
        <div
          id="wear-panel"
          className="wh-wear-panel"
          role="tabpanel"
          aria-labelledby={`wear-tab-${active.id}`}
        >
          <div className="wh-wear-photo">
            <img
              key={active.id}
              src={asset(active.id)}
              alt={active.alt}
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
            <span className="wh-photo-label">{active.detail}</span>
          </div>
          <div className="wh-wear-copy" key={`copy-${active.id}`}>
            <span className="wh-outline-number">{active.number}</span>
            <p className="wh-eyebrow">{active.name}</p>
            <h3>{active.title}</h3>
            <p>{active.description}</p>
            <div className="wh-same-core">
              <Seed />
              Same core. Same familiar companion.
            </div>
          </div>
        </div>
      </Reveal>
      <p className="wh-image-note">
        Exploring three ways to wear WayHome. Product imagery shows design
        concepts.
      </p>
    </section>
  );
}

const moments = [
  {
    title: "A gentle check-in.",
    body: "A simple question. Space to answer in your own time. A familiar voice in the small moments.",
    label: "Check-in",
  },
  {
    title: "A familiar way forward.",
    body: "Recognisable places and one clear step at a time. Explore how familiar landmarks could make a journey feel less overwhelming.",
    label: "Guidance",
  },
  {
    title: "Your people, closer.",
    body: "An easy way to ask for a little support. Explore the connection between a companion and the people who care.",
    label: "Connection",
  },
];

function Experience() {
  const [moment, setMoment] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  return (
    <section
      id="experience"
      className="wh-experience wh-section"
      aria-labelledby="experience-title"
    >
      <Reveal className="wh-experience-heading">
        <p className="wh-eyebrow">FAMILIAR BY DESIGN</p>
        <h2 id="experience-title" tabIndex={-1}>
          Small moments.
          <br />
          <span>A little reassurance.</span>
        </h2>
        <p>
          A companion concept for people living with dementia.
          <br className="wh-desktop-break" /> Designed around clarity,
          familiarity, and human connection.
        </p>
      </Reveal>
      <div className="wh-experience-grid">
        <Reveal className="wh-moments">
          {moments.map((item, index) => (
            <button
              key={item.label}
              className={`wh-moment ${moment === index ? "is-active" : ""}`}
              aria-pressed={moment === index}
              onClick={() => {
                setMoment(index);
                setResponse(null);
              }}
            >
              <span className="wh-moment-heading">
                <span>{item.title}</span>
                <Plus size={22} />
              </span>
              <span className="wh-moment-body">{item.body}</span>
            </button>
          ))}
          <Link to="/together" className="wh-inline-link">
            Explore the companion experience <ArrowRight size={18} />
          </Link>
        </Reveal>
        <Reveal className="wh-preview-stage">
          <div className="wh-ui-core">
            <div className="wh-ui-screen">
              <span className="wh-ui-time">
                9:41 <span>WAYHOME</span>
              </span>
              <Seed className="wh-screen-seed" />
              <div className="wh-ui-content" aria-live="polite">
                {response ? (
                  <>
                    <span className="wh-response-icon">
                      <Check size={22} />
                    </span>
                    <h3>{response}</h3>
                    <button
                      className="wh-screen-secondary"
                      onClick={() => setResponse(null)}
                    >
                      Try again
                    </button>
                  </>
                ) : moment === 0 ? (
                  <>
                    <h3>
                      How are you
                      <br />
                      feeling today?
                    </h3>
                    <button
                      className="wh-screen-primary"
                      onClick={() =>
                        setResponse("I'm glad you're feeling okay.")
                      }
                    >
                      I'm okay <Heart size={15} />
                    </button>
                    <button
                      className="wh-screen-secondary"
                      onClick={() =>
                        setResponse("Take your time. We're here with you.")
                      }
                    >
                      I'd like some support
                    </button>
                  </>
                ) : moment === 1 ? (
                  <>
                    <div className="wh-landmark-icon">
                      <svg viewBox="0 0 80 42" fill="none" aria-hidden="true">
                        <path
                          d="M4 37h72M14 35V23h52v12M12 22h56M25 23v13M55 23v13"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M36 22V7m0 4C22 13 24 1 24 1c12-2 12 10 12 10Zm1 4S51 17 51 5C39 4 37 15 37 15Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <h3>
                      A familiar
                      <br />
                      place ahead.
                    </h3>
                    <button
                      className="wh-screen-primary"
                      onClick={() =>
                        setResponse("One familiar step at a time.")
                      }
                    >
                      I recognise it <Check size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="wh-family-avatar">J</span>
                    <h3>
                      A little help
                      <br />
                      from Jamie.
                    </h3>
                    <button
                      className="wh-screen-primary"
                      onClick={() =>
                        setResponse("Your demo request is received.")
                      }
                    >
                      Ask for a check-in <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </div>
              <span className="wh-screen-bottom" />
            </div>
          </div>
          <p className="wh-preview-caption">
            <span />
            Try a moment above. This is a simulated preview.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  const reduced = useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const productY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const productRotate = useTransform(scrollYProgress, [0, 1], [0, -6]);
  function goTo(id: string) {
    const target = document.getElementById(id);
    target?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
    target?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }
  return (
    <div className="wh-landing">
      <a
        className="wh-skip"
        href="#/"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("wh-main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="wh-header">
        <Link to="/" className="wh-brand" aria-label="WayHome home">
          <Seed />
          <span>
            WayHome<span className="wh-brand-period">.</span>
          </span>
        </Link>
        <nav className="wh-nav" aria-label="Product navigation">
          <button onClick={() => goTo("design")}>The core</button>
          <button onClick={() => goTo("ways-to-wear")}>Ways to wear</button>
          <button onClick={() => goTo("experience")}>The experience</button>
        </nav>
        <Link to="/together" className="wh-nav-cta">
          Explore demo <ArrowRight size={15} />
        </Link>
      </header>
      <main id="wh-main" tabIndex={-1}>
        <section ref={hero} className="wh-hero" aria-labelledby="hero-title">
          <div className="wh-hero-inner">
            <div className="wh-hero-copy">
              <motion.p
                className="wh-eyebrow wh-hero-eyebrow"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                INTRODUCING WAYHOME CORE <span>CONCEPT</span>
              </motion.p>
              <motion.h1
                id="hero-title"
                initial={reduced ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1 }}
              >
                A familiar
                <br />
                feeling.
                <br />
                <span>Anywhere.</span>
              </motion.h1>
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <p className="wh-hero-description">
                  One gentle companion.
                  <br />
                  Made for the way you live.
                </p>
                <button
                  className="wh-pill wh-pill-light"
                  onClick={() => goTo("design")}
                >
                  Meet WayHome <ArrowDown size={17} />
                </button>
              </motion.div>
            </div>
            <motion.div
              className="wh-hero-product"
              style={
                reduced ? undefined : { y: productY, rotate: productRotate }
              }
            >
              <img
                src={asset("core")}
                width="1536"
                height="1024"
                alt="WayHome Core concept: a smooth silver device with a black glass face and a softly illuminated sprout"
                fetchPriority="high"
                decoding="async"
              />
            </motion.div>
          </div>
          <div className="wh-hero-bottom">
            <span>A NEW WAY TO KEEP FAMILIAR CLOSE</span>
            <button
              onClick={() => goTo("design")}
              aria-label="Scroll to the core design"
            >
              <span>SCROLL TO DISCOVER</span>
              <ArrowDown size={16} />
            </button>
            <span className="wh-hero-edition">DESIGN STUDY — 01</span>
          </div>
        </section>

        <section
          id="design"
          className="wh-design wh-section"
          aria-labelledby="design-title"
        >
          <Reveal>
            <p className="wh-eyebrow">
              A LITTLE OBJECT. A PERSONAL CONNECTION.
            </p>
            <h2 id="design-title" tabIndex={-1}>
              One core.
              <br />
              <span>So many ways to belong.</span>
            </h2>
          </Reveal>
          <Reveal className="wh-design-bottom">
            <div className="wh-core-outline">
              <Seed />
              <span>WayHome Core</span>
              <span className="wh-core-dot" />
            </div>
            <p>
              We believe a companion should feel like part of you. So we're
              exploring a single, removable core that moves between the things
              you choose to wear. Familiar in every form. Personal in every way.
            </p>
          </Reveal>
        </section>

        <WaysToWear />

        <section className="wh-detail" aria-labelledby="detail-title">
          <div className="wh-detail-visual">
            <img
              src={asset("core")}
              alt="Close view of the concept's softly curved glass, silver edge, and tactile side button"
              width="1536"
              height="1024"
              loading="lazy"
            />
          </div>
          <div className="wh-detail-copy">
            <Reveal>
              <p className="wh-eyebrow">THOUGHTFUL IN EVERY DETAIL</p>
              <h2 id="detail-title">
                Quietly considered.
                <br />
                <span>From every angle.</span>
              </h2>
              <p>
                A soft silhouette. A clear face. A touch you can find. We're
                shaping WayHome around the moments that should feel simple.
              </p>
              <div className="wh-detail-list">
                <span>
                  <i />A face that feels familiar
                </span>
                <span>
                  <i />A tactile point of connection
                </span>
                <span>
                  <i />A core shared across attachments
                </span>
              </div>
              <span className="wh-detail-note">
                An evolving physical design concept.
              </span>
            </Reveal>
          </div>
        </section>

        <Experience />

        <section className="wh-human" aria-labelledby="human-title">
          <img
            src={asset("everyday")}
            alt="An older woman and her adult daughter enjoying a quiet walk together in a sunlit park"
            width="1536"
            height="1024"
            loading="lazy"
          />
          <div className="wh-human-shade" />
          <Reveal className="wh-human-copy">
            <p className="wh-eyebrow">FOR THE LIFE AROUND IT</p>
            <h2 id="human-title">
              More everyday.
              <br />
              More you.
            </h2>
            <p>
              The little routines. The familiar faces.
              <br />
              The freedom to be yourself.
            </p>
          </Reveal>
          <span className="wh-human-caption">
            WayHome design vision · Illustrative concept imagery
          </span>
        </section>

        <section
          className="wh-closing wh-section"
          aria-labelledby="closing-title"
        >
          <Reveal>
            <Seed className="wh-closing-seed" />
            <p className="wh-eyebrow">A COMPANION. A CIRCLE OF CARE.</p>
            <h2 id="closing-title">
              Feel a little
              <br />
              <span>closer.</span>
            </h2>
            <p>
              Discover the experience we're building.
              <br />
              Step into the companion or see the caregiver's side.
            </p>
            <div className="wh-closing-actions">
              <Link
                to="/together"
                className="wh-pill wh-pill-dark"
                aria-label="Enter Companion Mode"
              >
                Try the companion <ArrowRight size={17} />
              </Link>
              <Link
                to="/caregiver"
                className="wh-pill wh-pill-outline"
                aria-label="Enter Caregiver Dashboard"
              >
                Caregiver dashboard <ArrowRight size={17} />
              </Link>
            </div>
            <Link to="/guided" className="wh-story-link">
              <span>
                <Play size={11} fill="currentColor" />
              </span>
              Take the guided demo
              <ChevronRight size={15} />
            </Link>
          </Reveal>
        </section>
      </main>
      <footer className="wh-footer">
        <div className="wh-footer-top">
          <Link to="/" className="wh-brand">
            <Seed />
            <span>WayHome.</span>
          </Link>
          <p>A little reassurance, wherever you go.</p>
          <button
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: reduced ? "auto" : "smooth",
              });
              document
                .getElementById("hero-title")
                ?.focus({ preventScroll: true });
            }}
          >
            Back to top <ArrowRight size={15} />
          </button>
        </div>
        <div className="wh-footer-bottom">
          <p>
            WayHome is a concept in development. Product images are design
            explorations. The interactive demo uses simulated location, device
            signals, and help requests; no real calls or emergency messages are
            sent. Not a medical device.
          </p>
          <span>
            WayHome · Moonshot 101
            <br />
            Designed around people.
          </span>
        </div>
      </footer>
    </div>
  );
}
