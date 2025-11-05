"use client";
import ManagerLayout from "@/components/ManagerLayout";
import { useState, useEffect } from "react";
import { getUsers } from "@/lib/api";
import { Users, Mail, Phone, MapPin, Briefcase } from "lucide-react";

export default function ManagerTeamPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const users = await getUsers();
      const team = users.filter((u: any) => u.rank === "werknemer");
      setTeamMembers(team);
    } catch (error) {
      console.error("Failed to load team:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Mijn Team
          </h1>
          <p className="text-gray-600">Overzicht van alle team leden</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {member.firstName} {member.lastName}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mt-1">
                    {member.rank}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span className="text-sm">{member.email}</span>
                </div>
                
                {member.function && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">{member.function}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span className="text-sm">
                    {member.city}, {member.postalCode}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">
                  Bekijk Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {teamMembers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Geen team leden gevonden</p>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
