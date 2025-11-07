interface MainGridProps {
  children: React.ReactNode;
}

export default function MainGrid({ children }: MainGridProps) {
  return (
    <div className="main-layout-container">
      {children}
    </div>
  );
}