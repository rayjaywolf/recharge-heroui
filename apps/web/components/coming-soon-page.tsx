type ComingSoonPageProps = {
  title: string;
  description?: string;
};

export function ComingSoonPage({
  title,
  description = "Coming soon.",
}: ComingSoonPageProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
