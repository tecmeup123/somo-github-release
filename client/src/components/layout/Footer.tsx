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
    <footer className="border-t border-border bg-card mt-12" data-testid="footer">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-semibold mb-4">SoMo Protocol</h4>
            <p className="text-sm text-muted-foreground">
              A social movement built on Nervos CKB using Spore Protocol and DOB/0 standards.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Technology</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.technology.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.url} 
                    className="hover:text-foreground transition-colors"
                    data-testid={`link-tech-${link.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.community.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.url} 
                    className="hover:text-foreground transition-colors"
                    data-testid={`link-community-${link.name.toLowerCase()}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 SoMo Protocol. Built on Nervos CKB with Spore Protocol.</p>
        </div>
      </div>
    </footer>
  );
}
