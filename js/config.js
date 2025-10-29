const SUPABASE_URL = "https://zghbpewskswoxcenfcdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnaGJwZXdza3N3b3hjZW5mY2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzEyNjEsImV4cCI6MjA3NzI0NzI2MX0.EE1-4tnhnoLEefyilR_wI_NOuSFeoEHOekVmadopTa0";
const ADMIN_DELETE_ENDPOINT = "https://guild-api2.vercel.app/api/delete-user";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) console.error("getUser error:", error);
  return user || null;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, email")
    .eq("id", user.id)
    .single();
  if (error) { console.error("getCurrentProfile error:", error); return null; }
  return data;
}

function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}