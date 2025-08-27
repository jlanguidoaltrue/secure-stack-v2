export default function Page(){
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Secure Frontend</h1>
      <p>Use Login or OAuth, then go to <b>Users</b> or <b>Profile</b>.</p>
      <ul className="list-disc pl-6 text-sm">
        <li>API base: <code>{process.env.NEXT_PUBLIC_API_URL}</code></li>
      </ul>
    </section>
  );
}
