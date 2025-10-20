"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSystemStats, useHealthCheck } from "@/hooks/useApi";
import { Users, MapPin, Bell, Server, Clock, MemoryStick } from "lucide-react";

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useSystemStats();
  const { data: health, loading: healthLoading } = useHealthCheck();

  // Only show to admins
  if (!user || user.role !== 'admin') {
    return null;
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (statsLoading) {
    return (
      <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
        <div className="text-center text-red-400">
          <p>Error loading admin stats</p>
          <button 
            onClick={() => refetchStats()}
            className="text-sm text-purple-400 hover:text-purple-300 mt-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${health?.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm text-gray-400">
            {health?.success ? 'System Healthy' : 'System Issues'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Stats */}
        <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {stats?.statistics.users.total || 0}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Users</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="text-green-400">{stats?.statistics.users.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Admins:</span>
              <span className="text-purple-400">{stats?.statistics.users.admins || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Participants:</span>
              <span className="text-blue-400">{stats?.statistics.users.participants || 0}</span>
            </div>
          </div>
        </div>

        {/* Spaces Stats */}
        <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <MapPin className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {stats?.statistics.spaces.total || 0}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Spaces</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="text-green-400">{stats?.statistics.spaces.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Public:</span>
              <span className="text-blue-400">{stats?.statistics.spaces.public || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Private:</span>
              <span className="text-orange-400">{stats?.statistics.spaces.private || 0}</span>
            </div>
          </div>
        </div>

        {/* Notifications Stats */}
        <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Bell className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {stats?.statistics.notifications.total_notifications || 0}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Notifications</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Unread:</span>
              <span className="text-red-400">{stats?.statistics.notifications.total_unread || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="text-gray-300">{stats?.statistics.notifications.total_notifications || 0}</span>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-sm font-bold text-white">
              {health && formatUptime(health.uptime)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">System</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="text-green-400">
                {stats?.statistics.system.uptime ? formatUptime(stats.statistics.system.uptime) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className="text-blue-400">
                {stats?.statistics.system.memory_usage ? 
                  formatBytes(stats.statistics.system.memory_usage.heapUsed) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed System Info */}
      {stats?.statistics.system.memory_usage && (
        <div className="bg-[#35354e] rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MemoryStick className="w-5 h-5" />
            Memory Usage Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">RSS:</span>
              <div className="text-white font-medium">
                {formatBytes(stats.statistics.system.memory_usage.rss)}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Heap Total:</span>
              <div className="text-white font-medium">
                {formatBytes(stats.statistics.system.memory_usage.heapTotal)}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Heap Used:</span>
              <div className="text-white font-medium">
                {formatBytes(stats.statistics.system.memory_usage.heapUsed)}
              </div>
            </div>
            <div>
              <span className="text-gray-400">External:</span>
              <div className="text-white font-medium">
                {formatBytes(stats.statistics.system.memory_usage.external)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            Last updated: {stats?.statistics.system.generated_at ? 
              new Date(stats.statistics.system.generated_at).toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
