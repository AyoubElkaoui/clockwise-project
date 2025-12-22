'use client';

import { useState, useEffect } from 'react';
import { getLeaveTypes, bookLeave, getMyLeave, LeaveType, LeaveBooking } from '@/lib/api/tasksApi';
import { toast } from 'react-hot-toast';

export default function LeaveBookingPage() {
  // State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myBookings, setMyBookings] = useState<LeaveBooking[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [includeHistorical, setIncludeHistorical] = useState(false);

  // Form state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state voor bookings
  const [viewFrom, setViewFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [viewTo, setViewTo] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  });

  // Fetch leave types
  useEffect(() => {
    fetchLeaveTypes();
  }, [includeHistorical]);

  // Fetch my bookings
  useEffect(() => {
    if (viewFrom && viewTo) {
      fetchMyBookings();
    }
  }, [viewFrom, viewTo]);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await getLeaveTypes(includeHistorical);
      setLeaveTypes(response.leaveTypes);
    } catch (error: any) {
      console.error('Error fetching leave types:', error);
      toast.error('Fout bij ophalen verloftypen: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await getMyLeave(viewFrom, viewTo);
      setMyBookings(response.bookings);
      setTotalHours(response.totalHours);
    } catch (error: any) {
      console.error('Error fetching my leave bookings:', error);
      toast.error('Fout bij ophalen boekingen: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTaskId) {
      toast.error('Selecteer een verloftype');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Selecteer start- en einddatum');
      return;
    }

    try {
      setSubmitting(true);

      // Genereer entries voor elke dag (alleen werkdagen)
      const entries = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();

        // Skip weekends (0 = zondag, 6 = zaterdag)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        entries.push({
          date: d.toISOString().split('T')[0],
          hours: hoursPerDay,
          description: description || undefined
        });
      }

      if (entries.length === 0) {
        toast.error('Geen werkdagen gevonden in geselecteerde periode');
        return;
      }

      const response = await bookLeave({
        taskId: selectedTaskId,
        entries
      });

      if (response.success) {
        toast.success(response.message);

        // Toon warnings indien aanwezig
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach(warning => toast.warning(warning));
        }

        // Reset form
        setSelectedTaskId(null);
        setStartDate('');
        setEndDate('');
        setDescription('');

        // Refresh bookings
        fetchMyBookings();
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error booking leave:', error);
      toast.error('Fout bij boeken verlof: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Group leave types by category
  const groupedLeaveTypes = leaveTypes.reduce((acc, lt) => {
    if (!acc[lt.category]) {
      acc[lt.category] = [];
    }
    acc[lt.category].push(lt);
    return acc;
  }, {} as Record<string, LeaveType[]>);

  // Category display names (Nederlandse namen)
  const categoryNames: Record<string, string> = {
    'VACATION': 'Vakantie',
    'SICK_LEAVE': 'Ziekteverlof',
    'TIME_FOR_TIME_ACCRUAL': 'T.v.T. Opbouw',
    'TIME_FOR_TIME_USAGE': 'T.v.T. Opname',
    'SPECIAL_LEAVE': 'Bijzonder Verlof',
    'PUBLIC_HOLIDAY': 'Feestdag',
    'FROST_DELAY': 'Vorstverlet',
    'SINGLE_DAY_LEAVE': 'Snipperdag',
    'SCHEDULED_FREE': 'Roostervrij',
    'MEDICAL_APPOINTMENT': 'Artsbezoek',
    'OTHER_ABSENCE': 'Overige Afwezigheid',
    'UNKNOWN': 'Onbekend'
  };

  const selectedTask = leaveTypes.find(lt => lt.id === selectedTaskId);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Verlof Boeken</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Boekingsformulier */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Nieuw Verlof</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Selector */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Verloftype</span>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text text-xs">Historisch</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={includeHistorical}
                      onChange={(e) => setIncludeHistorical(e.target.checked)}
                    />
                  </label>
                </label>

                {loading ? (
                  <div className="skeleton h-12 w-full"></div>
                ) : (
                  <select
                    className="select select-bordered w-full"
                    value={selectedTaskId || ''}
                    onChange={(e) => setSelectedTaskId(Number(e.target.value) || null)}
                    required
                  >
                    <option value="">Selecteer verloftype...</option>
                    {Object.entries(groupedLeaveTypes).map(([category, types]) => (
                      <optgroup key={category} label={categoryNames[category] || category}>
                        {types.map((lt) => (
                          <option key={lt.id} value={lt.id}>
                            {lt.code} - {lt.description}
                            {lt.isHistorical ? ' (HISTORISCH)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {/* Waarschuwing bij historische taak */}
              {selectedTask?.isHistorical && (
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Dit verloftype is gemarkeerd als historisch.</span>
                </div>
              )}

              {/* Datums */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Startdatum</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Einddatum</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Uren per dag */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Uren per dag</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  min="0.1"
                  max="24"
                  step="0.5"
                  required
                />
                <label className="label">
                  <span className="label-text-alt">Alleen werkdagen (ma-vr) worden geboekt</span>
                </label>
              </div>

              {/* Omschrijving */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Omschrijving (optioneel)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Eventuele toelichting..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Bezig met boeken...
                  </>
                ) : (
                  'Boek Verlof'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Mijn Boekingen */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Mijn Verlofboekingen</h2>

            {/* Filter */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Van</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={viewFrom}
                  onChange={(e) => setViewFrom(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Tot</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={viewTo}
                  onChange={(e) => setViewTo(e.target.value)}
                />
              </div>
            </div>

            {/* Totaal */}
            <div className="stats shadow mb-4">
              <div className="stat">
                <div className="stat-title">Totaal Uren</div>
                <div className="stat-value text-primary">{totalHours.toFixed(1)}</div>
                <div className="stat-desc">{myBookings.length} boekingen</div>
              </div>
            </div>

            {/* Lijst */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="table table-sm table-pin-rows">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Type</th>
                    <th>Uren</th>
                  </tr>
                </thead>
                <tbody>
                  {myBookings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500">
                        Geen boekingen gevonden
                      </td>
                    </tr>
                  ) : (
                    myBookings.map((booking) => (
                      <tr key={booking.bookingId}>
                        <td>{new Date(booking.date).toLocaleDateString('nl-NL')}</td>
                        <td>
                          <div className="tooltip" data-tip={booking.taskDescription}>
                            <span className="badge badge-sm">{booking.taskCode}</span>
                          </div>
                          {booking.description && (
                            <div className="text-xs text-gray-500">{booking.description}</div>
                          )}
                        </td>
                        <td>{booking.hours.toFixed(1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Info sectie */}
      <div className="card bg-base-200 shadow-xl mt-6">
        <div className="card-body">
          <h3 className="card-title text-lg">ℹ️ Informatie</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Verlof wordt automatisch geboekt voor alle <strong>werkdagen</strong> (ma-vr) in de geselecteerde periode</li>
            <li>Weekends worden overgeslagen</li>
            <li>Historische verloftypes zijn oude codes die niet meer actief gebruikt worden</li>
            <li>Bij dubbele boekingen krijg je een foutmelding</li>
            <li>Alle verloftypen starten met code <strong>Z</strong> (bijv. Z05 = Vakantie)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
