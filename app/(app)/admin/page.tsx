"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { USER_ROLE } from "@/lib/db-enums";
import { useState } from "react";

interface UserResponse {
  id: string;
  username: string;
  role: string;
  branchId: string;
}

interface ActivityResponse {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  timestamp: string;
  username?: string;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [newEmployee, setNewEmployee] = useState({
    username: "",
    password: "",
    role: USER_ROLE.STAFF as string,
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<UserResponse[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      return response.json();
    },
  });

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery<ActivityResponse[]>({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      const response = await fetch("/api/activity-logs?limit=50");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newEmployee) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create employee");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewEmployee({ username: "", password: "", role: USER_ROLE.STAFF });
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete employee");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // Verify user is OWNER
  if (user?.role !== USER_ROLE.OWNER) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold text-red-600">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Employee Management Section */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Employee Management</h1>

        {/* Create Employee Form */}
        <div className="border border-white/40 rounded-lg bg-white/40 backdrop-blur-sm p-4 space-y-4">
          <h2 className="text-lg font-semibold">Add New Employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Username"
              value={newEmployee.username}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, username: e.target.value })
              }
              className="px-3 py-2 border border-white/40 rounded-md bg-white/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={newEmployee.password}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, password: e.target.value })
              }
              className="px-3 py-2 border border-white/40 rounded-md bg-white/50"
            />
            <select
              value={newEmployee.role}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, role: e.target.value })
              }
              className="px-3 py-2 border border-white/40 rounded-md bg-white/50"
            >
              <option value={USER_ROLE.MANAGER}>{USER_ROLE.MANAGER}</option>
              <option value={USER_ROLE.STAFF}>{USER_ROLE.STAFF}</option>
              <option value={USER_ROLE.TECHNICIAN}>
                {USER_ROLE.TECHNICIAN}
              </option>
            </select>
          </div>
          <button
            onClick={() => createMutation.mutate(newEmployee)}
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            {createMutation.isPending ? "Creating..." : "Add Employee"}
          </button>
        </div>

        {/* Employee List */}
        <div className="border border-white/40 rounded-lg bg-white/40 backdrop-blur-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/50 border-b border-white/40">
              <tr>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-white/20 hover:bg-white/20"
                >
                  <td className="px-4 py-2">{emp.username}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteMutation.mutate(emp.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Activity Logs</h2>
        <div className="border border-white/40 rounded-lg bg-white/40 backdrop-blur-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/50 border-b border-white/40">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Details</th>
                <th className="px-4 py-2 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-white/20 hover:bg-white/20"
                >
                  <td className="px-4 py-2">{log.username || "Unknown"}</td>
                  <td className="px-4 py-2 font-medium">{log.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {log.details}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
