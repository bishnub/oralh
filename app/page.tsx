"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  HeartPulse,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import en from "@/translations/en";
import ne from "@/translations/ne";

type Resource = {
  id: string;
  name: string;
  speciality: string;
  order:number;
  image: string | null;
};

const services = [
  {
    key: "general",
    icon: Stethoscope,
  },
  {
    key: "hygiene",
    icon: Sparkles,
  },
  {
    key: "cosmetic",
    icon: HeartPulse,
  },
  {
    key: "implants",
    icon: ShieldCheck,
  },
  {
    key: "children",
    icon: Users,
  },
  {
    key: "emergency",
    icon: CalendarDays,
  },
];

export default function Home() {
  const [language, setLanguage] = useState<"en" | "ne">("en");

  const t = language === "en" ? en : ne;

  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await fetch("/api/resources");

        if (!response.ok) {
          throw new Error("Failed to load resources");
        }

        const data = await response.json();

        setResources(data.resources ?? []);
      } catch (error) {
        console.error("Error loading resources:", error);
      } finally {
        setLoadingResources(false);
      }
    };

    loadResources();
  }, []);

  return (
    <>
      {/* Navigation */}
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="logo">
            <span>
              <img src="/favicon.svg" alt="Oral-H Logo" width="36" height="36" />
            </span>
            <span className="logo-text">
              Oral-H
              <small>Dental Care</small>
            </span>
          </Link>

        <div className="nav-inner">
          <Link href="/" className="logo">
            ...
          </Link>

          <nav className="nav-links">
            <Link href="#about">{t.nav.about}</Link>
            <Link href="#services">{t.nav.services}</Link>
            <Link href="#team">{t.nav.team}</Link>
            <Link href="#contact">{t.nav.contact}</Link>
          </nav>
          <button
            type="button"
            className="language-switcher"
            onClick={() =>
              setLanguage((current) =>
                current === "en" ? "ne" : "en"
              )
            }
            aria-label={
              language === "en"
                ? "Switch to Nepali"
                : "Switch to English"
            }
            title={
              language === "en"
                ? "Switch to Nepali"
                : "Switch to English"
            }
          >
            <img
              src={language === "en" ? "/flags/np.svg" : "/flags/gb.svg"}
              alt={language === "en" ? "Nepali" : "English"}
            />
          </button>
        </div>

          <Link href={`/book?lang=${language}`} className="btn btn-primary">
            <CalendarDays size={17} />
            {t.nav.bookAppointment}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">
                {t.hero.eyebrow}
              </span>

              <h1>
                {t.hero.titleBefore}{" "}
                <span>{t.hero.titleHighlight}</span>
              </h1>

              <p className="hero-copy">
                {t.hero.description}
              </p>

              <div className="hero-actions">
                <Link href={`/book?lang=${language}`} className="btn btn-primary">
                  {t.hero.bookAppointment}
                  <ArrowRight size={17} />
                </Link>

                <Link
                  href="#services"
                  className="btn btn-outline"
                >
                  {t.hero.exploreServices}
                </Link>
              </div>

              <div className="hero-note">
                <div>
                  <strong>{t.hero.weekdays}</strong>
                  {t.hero.hours}
                </div>

                <div>
                  <strong>{t.hero.location}</strong>
                  {t.hero.transport}
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-circle circle-one" />
              <div className="hero-circle circle-two" />

              <div className="dental-symbol">
                <span>+</span>
              </div>

              <div className="hero-floating-card">
                <strong>{t.hero.floatingTitle}</strong>

                <span>
                  {t.hero.floatingDescription}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="stats">
          <div className="container stats-grid">
            <div className="stat">
              <strong>10+</strong>
              <span>{t.statistics.experience}</span>
            </div>

            <div className="stat">
              <strong>4.9/5</strong>
              <span>{t.statistics.satisfaction}</span>
            </div>

            <div className="stat">
              <strong>6,000+</strong>
              <span>{t.statistics.smiles}</span>
            </div>

            <div className="stat">
              <strong>6</strong>
              <span>{t.statistics.services}</span>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="section">
          <div className="container">
            <span className="eyebrow">
              {t.services.eyebrow}
            </span>

            <h2 className="section-title">
              {t.services.title}
            </h2>

            <p className="section-copy">
              {t.services.description}
            </p>

            <div className="services-grid">
              {services.map((service) => {
                const Icon = service.icon;

                const serviceTranslation =
                  t.services[
                    service.key as keyof typeof t.services
                  ];

                if (
                  typeof serviceTranslation !== "object" ||
                  !("title" in serviceTranslation)
                ) {
                  return null;
                }

                return (
                  <article
                    className="card"
                    key={service.key}
                  >
                    <div className="icon">
                      <Icon size={22} />
                    </div>

                    <h3>
                      {serviceTranslation.title}
                    </h3>

                    <p>
                      {serviceTranslation.description}
                    </p>

                    <Link
                      href={`/book?lang=${language}`}
                      className="service-link"
                    >
                      {t.services.learnMore}
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="section">
          <div className="container split">
            <div className="about-art">
              <div className="about-shape shape-one" />
              <div className="about-shape shape-two" />

              <div className="about-badge">
                <strong>{t.about.badgeTitle}</strong>
                <span>{t.about.badgeSubtitle}</span>
              </div>

              <div className="quote">
                <p>
                  “{t.about.quote}”
                </p>

                <span>
                  {t.about.quoteAuthor}
                </span>
              </div>
            </div>

            <div>
              <span className="eyebrow">
                {t.about.eyebrow}
              </span>

              <h2 className="section-title">
                {t.about.title}
              </h2>

              <p className="section-copy">
                {t.about.description1}
              </p>

              <p className="section-copy">
                {t.about.description2}
              </p>

              <div className="benefits">
                {t.about.benefits.map((item) => (
                  <div
                    className="benefit"
                    key={item}
                  >
                    <span className="benefit-icon">
                      <Check size={16} />
                    </span>

                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section id="team" className="section">
          <div className="container">
            <span className="eyebrow">
              {t.team.eyebrow}
            </span>

            <h2 className="section-title">
              {t.team.title}
            </h2>

            <p className="section-copy">
              {t.team.description}
            </p>

            <div className="team-grid">
              {loadingResources ? (
                <p>{t.team.loading}</p>
              ) : resources.length === 0 ? (
                <p>{t.team.unavailable}</p>
              ) : (
                resources.map((person) => (
                  <article
                    className="person"
                    key={person.id}
                  >
                    <div className="person-photo">
                      {person.order ? (
                        <img
                          src={`/team/${person.order}.jpg`}
                          alt={person.name}
                        />
                      ) : (
                        <div className="person-placeholder">
                          <Users size={48} />
                        </div>
                      )}
                    </div>

                    <div className="person-info">
                      <h3>{person.name}</h3>
                      <p>{person.speciality}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container">
            <div className="cta">
              <div>
                <h2>{t.cta.title}</h2>

                <p>{t.cta.description}</p>
              </div>

              <Link
                href={`/book?lang=${language}`}
                className="btn btn-light"
              >
                {t.cta.button}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section
          id="contact"
          className="section contact-section"
        >
          <div className="container">
            <span className="eyebrow">
              {t.contact.eyebrow}
            </span>

            <h2 className="section-title">
              {t.contact.title}
            </h2>

            <div className="contact-grid">
              <div className="contact-card">
                <div className="contact-row">
                  <span className="icon">
                    <MapPin size={19} />
                  </span>

                  <div>
                    <strong>
                      {t.contact.address}
                    </strong>

                    <span>
                      Biratnagar 7
                      <br />
                      56613 Dharan Road, Nepal
                    </span>
                  </div>
                </div>

                <div className="contact-row">
                  <span className="icon">
                    <Phone size={19} />
                  </span>

                  <div>
                    <strong>
                      {t.contact.phone}
                    </strong>

                    <span>
                      +977 9807302924
                    </span>
                  </div>
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-row">
                  <span className="icon">
                    <Clock3 size={19} />
                  </span>

                  <div>
                    <strong>
                      {t.contact.openingHours}
                    </strong>

                    <span>
                      {t.contact.weekdays}
                      <br />
                      {t.contact.sunday}
                      <br />
                      {t.contact.saturday}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/book?lang=${language}`}
                  className="btn btn-primary"
                >
                  {t.contact.bookVisit}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>Oracle Dental Care</strong>
            <span>{t.footer.beta}</span>
          </div>

          <div>
            {t.footer.copyright} ·{" "}
            {t.footer.privacy} ·{" "}
            {t.footer.impressum}
          </div>
        </div>
      </footer>
    </>
  );
}