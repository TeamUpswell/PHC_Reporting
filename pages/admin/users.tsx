import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;

      // You'll need to create an admin role or flag in your database
      const { data, error } = await supabase
        .from("user_roles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error || !data?.is_admin) {
        // Not admin, redirect away
        router.push("/dashboard");
      }
    };

    checkAdmin();
  }, [user, router]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // This requires admin permissions in Supabase
        const {
          data: { users },
          error,
        } = await supabase.auth.admin.listUsers();

        if (error) throw error;
        setUsers(users || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Invite a new user
  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (error) throw error;

      // Send invitation email (you'd normally use an email service here)
      alert(`User invited: ${email}\nTemporary password: ${tempPassword}`);

      // Refresh the list
      setUsers([...users, data.user]);
      setEmail("");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>

        {/* Invite form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Invite New User</h2>
          <form onSubmit={inviteUser} className="flex gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-grow px-4 py-2 border rounded"
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {inviting ? "Inviting..." : "Invite User"}
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current Users</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email_confirmed_at ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
