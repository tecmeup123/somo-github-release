export default function Footer() {
  const links = {
    technology: [
      { name: "Nervos CKB", url: "https://www.nervos.org/" },
      { name: "Spore Protocol", url: "https://spore.pro/" },
      { name: "DOB/0 Standard", url: "https://github.com/sporeprotocol/dob-cookbook" },
      { name: "JoyID Wallet", url: "https://joy.id/en" },
      { name: "CKB Explorer", url: "https://explorer.nervos.org/" },
    ],
    community: [
      { name: "Twitter", url: "https://x.com/SoMoPixel" },
      { name: "Telegram", url: "https://t.me/somoapp/1" },
    ],
  };

  return (
    <footer
      className="mt-12 relative"
      style={{ borderTop: "1px solid rgba(9,211,255,0.12)" }}
      data-testid="footer"
    >
      {/* Subtle top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(9,211,255,0.25), transparent)" }}
      />

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4
              className="font-bold mb-4 text-base"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(90deg, #09D3FF, #FFBDFC)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SoMo Protocol
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A social movement built on Nervos CKB using Spore Protocol and DOB/0 standards.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm text-foreground/70 uppercase tracking-widest">Technology</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.technology.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="hover:text-primary transition-colors duration-150"
                    data-testid={`link-tech-${link.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm text-foreground/70 uppercase tracking-widest">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.community.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="hover:text-primary transition-colors duration-150"
                    data-testid={`link-community-${link.name.toLowerCase()}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-8 pt-8 text-center text-xs text-muted-foreground/60"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          &copy; {new Date().getFullYear()} SoMo Protocol. Built on Nervos CKB with Spore Protocol.
        </div>
      </div>
    </footer>
  );
}
