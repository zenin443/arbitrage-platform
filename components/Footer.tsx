"use client";
"use client";
import Link from "next/link";

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
  { label: "New Listings", href: "/new-listings" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Risk Disclaimer", href: "/legal/risk-disclaimer" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

const supportLinks = [
  { label: "Documentation", href: "#" },
  { label: "Contact", href: "#" },
];

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0F172A",
        borderTop: "1px solid #1E293B",
        fontFamily: "'Exo 2', sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {/* Amber lightning bolt */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#F59E0B"
                aria-hidden="true"
              >
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
              </svg>
              {/* Blue lightning bolt */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#3B82F6"
                aria-hidden="true"
                style={{ marginLeft: "-6px" }}
              >
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
              </svg>
              <span
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  color: "#E2E8F0",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                }}
              >
                Arbitrance Terminal
              </span>
            </div>

            <p style={{ color: "#94A3B8", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Professional arbitrage signal terminal for crypto markets.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-4 mt-1">
              {/* GitHub */}
              <a
                href="#"
                aria-label="GitHub"
                className="transition-colors duration-200"
                style={{ color: "#94A3B8" }}
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = "#F59E0B")
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8")
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              {/* Telegram */}
              <a
                href="#"
                aria-label="Telegram"
                className="transition-colors duration-200"
                style={{ color: "#94A3B8" }}
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = "#F59E0B")
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8")
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h3
              style={{
                color: "#F59E0B",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Product
            </h3>
            <ul className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Legal */}
          <div>
            <h3
              style={{
                color: "#F59E0B",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Legal
            </h3>
            <ul className="flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Support */}
          <div>
            <h3
              style={{
                color: "#F59E0B",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Support
            </h3>
            <ul className="flex flex-col gap-3 mb-4">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
            <a
              href="mailto:support@arbitrance.com"
              style={{
                color: "#94A3B8",
                fontSize: "0.85rem",
                display: "inline-block",
                transition: "color 0.2s",
              }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#F59E0B")
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8")
              }
            >
              support@arbitrance.com
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid #1E293B",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span style={{ color: "#64748B", fontSize: "0.8rem" }}>
            © 2026 Arbitrance Terminal. All rights reserved.
          </span>
          <span style={{ color: "#64748B", fontSize: "0.8rem" }}>
            Not financial advice. Trading involves significant risk.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http") || href === "#";

  const style: React.CSSProperties = {
    color: "#94A3B8",
    fontSize: "0.875rem",
    transition: "color 0.2s",
    textDecoration: "none",
  };

  if (isExternal) {
    return (
      <a
        href={href}
        style={style}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = "#F59E0B")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8")
        }
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      style={style}
      onMouseOver={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color = "#F59E0B")
      }
      onMouseOut={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color = "#94A3B8")
      }
    >
      {children}
    </Link>
  );
}
