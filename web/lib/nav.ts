export const siteNav = [
  { href: "/#problem", label: "Problem" },
  { href: "/#solution", label: "Solution" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/launch-support", label: "Launch support" },
  { href: "/#features", label: "Features" },
] as const;

export const siteLinks = {
  home: "/",
  tokenomics: "/tokenomics",
  launchSupport: "/launch-support",
  launch: "/#launch",
  community: "#", // placeholder
} as const;
