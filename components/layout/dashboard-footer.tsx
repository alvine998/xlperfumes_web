type DashboardFooterProps = {
  section: string;
};

export function DashboardFooter({ section }: DashboardFooterProps) {
  return (
    <footer className="dashboard-footer">
      <span>
        XL PERFUMES <i>·</i> {section}
      </span>
      <span>© 2026 XL PERFUMES</span>
    </footer>
  );
}
