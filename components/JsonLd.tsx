// Renders a JSON-LD structured-data script. `data` is serialized server-side;
// `<` is escaped so a value containing "</script>" cannot break out of the tag.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
