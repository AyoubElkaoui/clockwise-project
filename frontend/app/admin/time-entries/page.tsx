"use client";
import React, {useState, useEffect, JSX} from "react";
import { getAdminTimeEntries, getTimeEntryDetails, approveTimeEntry, rejectTimeEntry } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import dayjs from "dayjs";
import ToastNotification from "@/components/ToastNotification";
import { TimeEntry, User, Project, ProjectGroup, Company } from "@/lib/types";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    ClockIcon,
    UserIcon,
    BuildingOfficeIcon,
    FolderIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    CalendarDaysIcon,
    ArrowDownTrayIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ViewColumnsIcon
} from "@heroicons/react/24/outline";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import autoTable from "jspdf-autotable";
import MonthlyReportSection from "@/components/MonthlyReportSection";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface AdminProcessedByUser {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    rank?: string;
    email?: string;
}

interface AdminExtendedTimeEntry extends Omit<TimeEntry, 'processedByUser'> {
    user: User;
    project?: Project & {
        projectGroup?: ProjectGroup & {
            company?: Company;
        };
    };
    processedByUser?: AdminProcessedByUser;
    processedDate?: string;
    processingNotes?: string;
}

interface UserOption {
    id: number;
    name: string;
}

interface ProjectOption {
    id: number | undefined;
    name: string | undefined;
}

// Generic group interface that works for day, week, and month
interface TimeEntryGroup {
    groupKey: string;
    groupStart: dayjs.Dayjs;
    groupEnd: dayjs.Dayjs;
    user: User;
    entries: AdminExtendedTimeEntry[];
    totalHours: number;
    status: 'mixed' | 'ingeleverd' | 'goedgekeurd' | 'afgekeurd' | 'opgeslagen';
    canApprove: boolean;
    groupType: 'day' | 'week' | 'month';
    displayName: string;
}

type ViewType = 'day' | 'week' | 'month';

export default function AdminTimeEntriesPage(): JSX.Element {
    const [entries, setEntries] = useState<AdminExtendedTimeEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [entriesPerPage] = useState<number>(10);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isPdfExporting, setIsPdfExporting] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<AdminExtendedTimeEntry | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
    const [rejectingGroup, setRejectingGroup] = useState<TimeEntryGroup | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState<string>("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [viewType, setViewType] = useState<ViewType>('week'); // New state for view type

    const [startDate, setStartDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchEntries = async (): Promise<void> => {
            try {
                const data = await getAdminTimeEntries();

                let safeData: AdminExtendedTimeEntry[] = [];
                if (Array.isArray(data)) {
                    safeData = data.map((entry: any) => ({
                        ...entry,
                        processedByUser: entry.processedByUser ? {
                            id: entry.processedByUser.id,
                            firstName: entry.processedByUser.firstName,
                            lastName: entry.processedByUser.lastName,
                            fullName: entry.processedByUser.fullName ||
                                `${entry.processedByUser.firstName} ${entry.processedByUser.lastName}`.trim(),
                            rank: entry.processedByUser.rank,
                            email: entry.processedByUser.email
                        } : null,
                        user: {
                            ...entry.user,
                            fullName: entry.user?.fullName ||
                                `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim()
                        },
                        processedDate: entry.processedDate,
                        processingNotes: entry.processingNotes
                    }));
                } else if (data && typeof data === 'object' && 'timeEntries' in data && Array.isArray(data.timeEntries)) {
                    safeData = data.timeEntries;
                } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
                    safeData = data.data;
                } else {
                    console.warn("Received non-array data:", data);
                    safeData = [];
                }

                setEntries(safeData);
            } catch (error) {
                console.error("Error fetching time entries:", error);
                setEntries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, []);

    // Reset page when view type changes
    useEffect(() => {
        setCurrentPage(1);
        setExpandedGroups(new Set());
    }, [viewType]);

    const groupEntriesByPeriod = (entries: AdminExtendedTimeEntry[], groupType: ViewType): TimeEntryGroup[] => {
        const groups = new Map<string, TimeEntryGroup>();

        entries.forEach(entry => {
            if (!entry || !entry.startTime || !entry.user) return;

            const entryDate = dayjs(entry.startTime);
            let groupStart: dayjs.Dayjs;
            let groupEnd: dayjs.Dayjs;
            let groupKey: string;
            let displayName: string;

            switch (groupType) {
                case 'day':
                    groupStart = entryDate.startOf('day');
                    groupEnd = entryDate.endOf('day');
                    groupKey = `${entry.userId}-${groupStart.format('YYYY-MM-DD')}`;
                    displayName = groupStart.format('DD MMMM YYYY');
                    break;

                case 'week':
                    // Ensure we start from Monday
                    groupStart = entryDate.startOf('week').add(1, 'day'); // Monday
                    groupEnd = groupStart.add(6, 'days'); // Sunday
                    groupKey = `${entry.userId}-${groupStart.format('YYYY-MM-DD')}`;
                    displayName = `${groupStart.format('DD MMM')} - ${groupEnd.format('DD MMM YYYY')}`;
                    break;

                case 'month':
                    groupStart = entryDate.startOf('month');
                    groupEnd = entryDate.endOf('month');
                    groupKey = `${entry.userId}-${groupStart.format('YYYY-MM')}`;
                    displayName = groupStart.format('MMMM YYYY');
                    break;

                default:
                    return;
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    groupKey,
                    groupStart,
                    groupEnd,
                    user: entry.user,
                    entries: [],
                    totalHours: 0,
                    status: 'opgeslagen',
                    canApprove: false,
                    groupType,
                    displayName
                });
            }

            const group = groups.get(groupKey)!;
            group.entries.push(entry);

            // Calculate hours
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
            const hours = diffMin > 0 ? diffMin / 60 : 0;
            group.totalHours += hours;
        });

        // Determine status and approval capability for each group
        groups.forEach(group => {
            const statuses = [...new Set(group.entries.map(e => e.status))];

            if (statuses.length === 1) {
                group.status = statuses[0] as any;
            } else {
                group.status = 'mixed';
            }

            // Check if the entire period is within the date filter range
            const filterStart = dayjs(startDate).startOf("day");
            const filterEnd = dayjs(endDate).endOf("day");

            // For proper approval, we need the complete period to be visible
            const isCompletePeriodVisible = group.groupStart.isSameOrAfter(filterStart) &&
                group.groupEnd.isSameOrBefore(filterEnd);

            // Can approve if:
            // 1. All entries are submitted (admin can approve any user's entries)
            // 2. The complete period is visible within the date filter
            // 3. We have entries for this period (safety check)
            group.canApprove = group.entries.length > 0 &&
                group.entries.every(e => e.status === 'ingeleverd') &&
                isCompletePeriodVisible;
        });

        return Array.from(groups.values())
            .sort((a, b) => b.groupStart.valueOf() - a.groupStart.valueOf());
    };

    // Apply filters and group by selected period
    const filteredEntries = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const start = dayjs(startDate).startOf("day");
            const end = dayjs(endDate).endOf("day");

            return entries.filter((entry: AdminExtendedTimeEntry) => {
                try {
                    if (!entry || !entry.startTime) return false;

                    const entryDate = dayjs(entry.startTime);
                    if (!entryDate.isValid()) return false;

                    const dateInRange = entryDate.isBetween(start, end, "day", "[]")
                    const userMatch = selectedUser ? entry.user?.id === parseInt(selectedUser) : true;
                    const projectMatch = selectedProject ? entry.project?.id === parseInt(selectedProject) : true;

                    const searchLower = searchTerm.toLowerCase();
                    const userName = entry.user?.fullName || `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.trim();
                    const searchMatch = !searchTerm ||
                        (userName.toLowerCase().includes(searchLower)) ||
                        (entry.project?.name && entry.project.name.toLowerCase().includes(searchLower)) ||
                        (entry.notes && entry.notes.toLowerCase().includes(searchLower));

                    return dateInRange && userMatch && projectMatch && searchMatch;
                } catch (error) {
                    console.warn("Error filtering entry:", entry, error);
                    return false;
                }
            });
        } catch (error) {
            console.error("Error filtering entries:", error);
            return [];
        }
    })();

    const timeEntryGroups = groupEntriesByPeriod(filteredEntries, viewType);

    // Create unique lists of users and projects for filters
    const users = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const userMap = new Map<number, UserOption>();
            for (const entry of entries) {
                if (entry?.user?.id) {
                    const fullName = entry.user.fullName || `${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim();
                    userMap.set(entry.user.id, {
                        id: entry.user.id,
                        name: fullName || 'Onbekende gebruiker'
                    });
                }
            }
            return Array.from(userMap.values());
        } catch (error) {
            console.error("Error creating user options:", error);
            return [];
        }
    })();

    const projects = (() => {
        if (!Array.isArray(entries)) return [];

        try {
            const projectMap = new Map<number, ProjectOption>();
            for (const entry of entries) {
                if (entry?.project?.id && entry?.project?.name) {
                    projectMap.set(entry.project.id, {
                        id: entry.project.id,
                        name: entry.project.name
                    });
                }
            }
            return Array.from(projectMap.values());
        } catch (error) {
            console.error("Error creating project options:", error);
            return [];
        }
    })();

    // Calculate stats
    const stats = {
        total: entries.length,
        pending: entries.filter(e => e.status === 'ingeleverd').length,
        approved: entries.filter(e => e.status === 'goedgekeurd').length,
        rejected: entries.filter(e => e.status === 'afgekeurd').length,
        draft: entries.filter(e => e.status === 'opgeslagen').length,
        groups: timeEntryGroups.length,
        groupsToApprove: timeEntryGroups.filter(g => g.canApprove).length
    };

    // Pagination for groups
    const indexOfLastGroup = currentPage * entriesPerPage;
    const indexOfFirstGroup = indexOfLastGroup - entriesPerPage;
    const currentGroups = timeEntryGroups.slice(indexOfFirstGroup, indexOfLastGroup);
    const totalPages = Math.ceil(timeEntryGroups.length / entriesPerPage);

    const handleViewDetails = async (entryId: number): Promise<void> => {
        try {
            const details = await getTimeEntryDetails(entryId);
            setSelectedEntry(details);
            setShowDetailsModal(true);
        } catch (error) {
            console.error("Error fetching time entry details:", error);
            setToastMessage("Fout bij ophalen details");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handleApproveGroup = async (group: TimeEntryGroup): Promise<void> => {
        const periodName = viewType === 'day' ? 'dag' : viewType === 'week' ? 'week' : 'maand';
        if (!confirm(`Weet u zeker dat u de hele ${periodName} (${group.entries.length} dagen) voor ${group.user.fullName} wilt goedkeuren?`)) return;

        try {
            await Promise.all(group.entries.map(entry => approveTimeEntry(entry.id as number)));

            const updatedData = await getAdminTimeEntries();
            setEntries(Array.isArray(updatedData) ? updatedData : []);
            setToastMessage(`${periodName.charAt(0).toUpperCase() + periodName.slice(1)} goedgekeurd voor ${group.user.fullName} (${group.entries.length} dagen)`);
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            console.error(`Error approving ${periodName}:`, error);
            setToastMessage(`Fout bij goedkeuren van ${periodName}`);
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handleRejectGroup = (group: TimeEntryGroup): void => {
        setRejectingGroup(group);
        setRejectionNotes("");
        setShowRejectModal(true);
    };

    const confirmRejectGroup = async (): Promise<void> => {
        if (!rejectingGroup || !rejectionNotes.trim()) {
            setToastMessage("Vul een reden in voor afkeuring");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        const periodName = viewType === 'day' ? 'dag' : viewType === 'week' ? 'week' : 'maand';

        try {
            await Promise.all(rejectingGroup.entries.map(entry =>
                rejectTimeEntry(entry.id as number, rejectionNotes)
            ));

            setShowRejectModal(false);
            const updatedData = await getAdminTimeEntries();
            setEntries(Array.isArray(updatedData) ? updatedData : []);
            setToastMessage(`${periodName.charAt(0).toUpperCase() + periodName.slice(1)} afgekeurd voor ${rejectingGroup.user.fullName} (${rejectingGroup.entries.length} dagen)`);
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            console.error(`Error rejecting ${periodName}:`, error);
            setToastMessage(`Fout bij afkeuren van ${periodName}`);
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        } finally {
            setRejectingGroup(null);
            setRejectionNotes("");
        }
    };

    const toggleGroupExpansion = (groupKey: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey);
        } else {
            newExpanded.add(groupKey);
        }
        setExpandedGroups(newExpanded);
    };

    function goToPage(page: number): void {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        setCurrentPage(page);
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'ingeleverd': return 'badge-warning';
            case 'goedgekeurd': return 'badge-success';
            case 'afgekeurd': return 'badge-error';
            case 'mixed': return 'badge-info';
            default: return 'badge-ghost';
        }
    };

    const getViewTypeDisplayName = (type: ViewType) => {
        switch (type) {
            case 'day': return 'Dag';
            case 'week': return 'Week';
            case 'month': return 'Maand';
        }
    };

    // Excel export function
    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const groupData = timeEntryGroups.map((group: TimeEntryGroup) => {
                const userName = group.user?.fullName ||
                    `${group.user?.firstName || ''} ${group.user?.lastName || ''}`.trim() || 'Onbekend';

                return {
                    [getViewTypeDisplayName(viewType)]: group.displayName,
                    'Medewerker': userName,
                    'Aantal Dagen': group.entries.length,
                    'Totaal Uren': parseFloat(group.totalHours.toFixed(2)),
                    'Status': group.status,
                    'Kan Goedkeuren': group.canApprove ? 'Ja' : 'Nee',
                    'Projecten': [...new Set(group.entries.map(e => e.project?.name).filter(Boolean))].join(', '),
                    'Bedrijven': [...new Set(group.entries.map(e => e.project?.projectGroup?.company?.name).filter(Boolean))].join(', ')
                };
            });

            const workbook = XLSX.utils.book_new();
            const totalHours = groupData.reduce((sum, group) => sum + group['Totaal Uren'], 0);

            const summaryData = [
                {
                    [getViewTypeDisplayName(viewType)]: 'SAMENVATTING',
                    'Medewerker': `${groupData.length} ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'}`,
                    'Aantal Dagen': '',
                    'Totaal Uren': `${totalHours.toFixed(2)} totaal uren`,
                    'Status': `Geëxporteerd: ${dayjs().format('DD-MM-YYYY HH:mm')}`,
                    'Kan Goedkeuren': '',
                    'Projecten': '',
                    'Bedrijven': ''
                },
                {},
                ...groupData
            ];

            const worksheet = XLSX.utils.json_to_sheet(summaryData);
            const columnWidths = [
                { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
                { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 40 }
            ];
            worksheet['!cols'] = columnWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, `Admin ${getViewTypeDisplayName(viewType)}overzicht`);

            const dateRange = `${dayjs(startDate).format('DD-MM')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            const filename = `Admin_${getViewTypeDisplayName(viewType)}overzicht_${dateRange.replace(/\//g, '-')}_${dayjs().format('HH-mm')}.xlsx`;

            XLSX.writeFile(workbook, filename);

            setToastMessage(`Excel bestand "${filename}" gedownload (${groupData.length} ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'})`);
            setToastType("success");
            setTimeout(() => setToastMessage(""), 4000);

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            setToastMessage("Fout bij exporteren naar Excel");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        } finally {
            setIsExporting(false);
        }
    };

    // PDF export function
    const exportToPdf = async () => {
        setIsPdfExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const pdf = new jsPDF('l', 'mm', 'a4');

            pdf.setProperties({
                title: `Admin ${getViewTypeDisplayName(viewType)}overzicht Export`,
                subject: `Admin ${viewType}ly Time Entries Report`,
                author: 'Elmar Timetracking System',
                creator: 'Elmar Timetracking System'
            });

            pdf.setFontSize(20);
            pdf.setTextColor(59, 130, 246);
            pdf.text(`Admin ${getViewTypeDisplayName(viewType)}overzicht`, 14, 20);

            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            const pdfDateRange = `${dayjs(startDate).format('DD-MM-YYYY')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            pdf.text(`Periode: ${pdfDateRange}`, 14, 30);
            pdf.text(`Geëxporteerd: ${dayjs().format('DD-MM-YYYY HH:mm')}`, 14, 35);
            pdf.text(`Aantal ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'}: ${timeEntryGroups.length}`, 14, 40);

            const totalHours = timeEntryGroups.reduce((sum, group) => sum + group.totalHours, 0);
            pdf.text(`Totaal uren: ${totalHours.toFixed(2)}`, 14, 45);

            const tableData = timeEntryGroups.map(group => {
                const userName = group.user?.fullName ||
                    `${group.user?.firstName || ''} ${group.user?.lastName || ''}`.trim() || 'Onbekend';

                return [
                    group.displayName,
                    userName,
                    group.entries.length.toString(),
                    group.totalHours.toFixed(2),
                    group.status,
                    group.canApprove ? 'Ja' : 'Nee',
                    [...new Set(group.entries.map(e => e.project?.name).filter(Boolean))].join(', ')
                ];
            });

            const headers = [
                getViewTypeDisplayName(viewType),
                'Medewerker',
                'Dagen',
                'Uren',
                'Status',
                'Kan Goedkeuren',
                'Projecten'
            ];

            autoTable(pdf, {
                head: [headers],
                body: tableData,
                startY: 55,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 50 }
                },
                margin: { top: 55, right: 14, bottom: 20, left: 14 }
            });

            const pdfFileDateRange = `${dayjs(startDate).format('DD-MM')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            const filename = `Admin_${getViewTypeDisplayName(viewType)}overzicht_${pdfFileDateRange.replace(/\//g, '-')}_${dayjs().format('HH-mm')}.pdf`;

            pdf.save(filename);

            setToastMessage(`PDF bestand "${filename}" gedownload (${timeEntryGroups.length} ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'})`);
            setToastType("success");
            setTimeout(() => setToastMessage(""), 4000);

        } catch (error) {
            console.error('Error exporting to PDF:', error);
            setToastMessage("Fout bij exporteren naar PDF");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        } finally {
            setIsPdfExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Admin overzicht laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in px-2 sm:px-4 lg:px-0">
                {/* Header Section */}
                <div className="bg-gradient-elmar text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-elmar-card">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                        <CalendarDaysIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Admin {getViewTypeDisplayName(viewType)} Beheer</h1>
                    </div>
                    <p className="text-blue-100 text-sm sm:text-base lg:text-lg">Beheer en keur urenregistraties per {viewType === 'day' ? 'dag' : viewType === 'week' ? 'week' : 'maand'} goed als administrator</p>
                </div>

                {/* View Type Selector */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-xl sm:rounded-2xl">
                    <div className="card-body p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <ViewColumnsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-elmar-primary" />
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Weergave Type</h2>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {(['day', 'week', 'month'] as ViewType[]).map((type) => (
                                    <button
                                        key={type}
                                        className={`btn btn-sm sm:btn-md rounded-lg sm:rounded-xl transition-all duration-200 flex-1 sm:flex-none text-xs sm:text-sm ${
                                            viewType === type
                                                ? 'btn-primary'
                                                : 'btn-outline btn-primary hover:btn-primary'
                                        }`}
                                        onClick={() => setViewType(type)}
                                    >
                                        📅 {getViewTypeDisplayName(type)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="alert alert-info shadow-lg">
                    <InformationCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base">Admin {getViewTypeDisplayName(viewType)}beheer</h3>
                        <p className="text-xs sm:text-sm">
                            Urenregistraties zijn nu gegroepeerd per {viewType === 'day' ? 'dag' : viewType === 'week' ? 'week' : 'maand'} per medewerker.
                            U kunt hele {viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'} in één keer goedkeuren of afkeuren voor alle medewerkers.
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <CalendarDaysIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">
                                    {viewType === 'day' ? 'Dagen' : viewType === 'week' ? 'Weken' : 'Maanden'}
                                </p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.groups}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">Te beoordelen</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.groupsToApprove}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">Totaal dagen</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">Goedgekeurd</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.approved}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <XCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">Afgekeurd</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.rejected}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                                <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium">Concept</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{stats.draft}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-xl sm:rounded-2xl">
                    <div className="card-body p-4 sm:p-6 lg:p-8">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <FunnelIcon className="w-5 h-5 sm:w-6 sm:h-6 text-elmar-primary" />
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Filters</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div>
                                <label className="label">
                                    <span className="label-text text-xs sm:text-sm font-semibold text-gray-700">📅 Startdatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-lg sm:rounded-xl text-sm w-full"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text text-xs sm:text-sm font-semibold text-gray-700">📅 Einddatum</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-lg sm:rounded-xl text-sm w-full"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text text-xs sm:text-sm font-semibold text-gray-700">👤 Medewerker</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-lg sm:rounded-xl text-sm w-full"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="">Alle medewerkers</option>
                                    {Array.isArray(users) && users.map((user: UserOption) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text text-xs sm:text-sm font-semibold text-gray-700">📁 Project</span>
                                </label>
                                <select
                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-lg sm:rounded-xl text-sm w-full"
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                >
                                    <option value="">Alle projecten</option>
                                    {Array.isArray(projects) && projects.map((project: ProjectOption) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-control mt-3 sm:mt-4">
                            <label className="label">
                                <span className="label-text text-xs sm:text-sm font-semibold text-gray-700">🔍 Zoeken</span>
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Zoek op naam, project of notities..."
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-lg sm:rounded-xl pl-10 w-full text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-actions justify-end mt-3 sm:mt-4">
                            <button
                                className="btn btn-primary btn-sm sm:btn-md rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-200 text-xs sm:text-sm"
                                onClick={() => {
                                    setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
                                    setEndDate(dayjs().format('YYYY-MM-DD'));
                                    setSelectedUser("");
                                    setSelectedProject("");
                                    setSearchTerm("");
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Time Entries Table */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-xl sm:rounded-2xl">
                    <div className="card-body p-0">
                        <div className="bg-gradient-to-r from-gray-50 to-white p-4 sm:p-6 border-b border-gray-100">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6 text-elmar-primary" />
                                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Admin {getViewTypeDisplayName(viewType)}overzicht</h2>
                                    <span className="badge badge-primary text-xs">{timeEntryGroups.length} {viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'}</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="hidden sm:block">
                                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">Exporteren</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className={`btn btn-ghost btn-sm sm:btn-md p-2 rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-200 hover:bg-green-50 ${isExporting ? 'loading' : ''}`}
                                            onClick={exportToExcel}
                                            disabled={isExporting || timeEntryGroups.length === 0}
                                            title={isExporting ? 'Exporteren naar Excel...' : `Exporteren naar Excel (${timeEntryGroups.length} ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'})`}
                                        >
                                            {!isExporting && (
                                                <img
                                                    src="/images/excel.webp"
                                                    alt="Excel export"
                                                    className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 object-contain"
                                                />
                                            )}
                                            {isExporting && <div className="loading loading-spinner loading-sm"></div>}
                                        </button>

                                        <button
                                            className={`btn btn-ghost btn-sm sm:btn-md p-2 rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-200 hover:bg-red-50 ${isPdfExporting ? 'loading' : ''}`}
                                            onClick={exportToPdf}
                                            disabled={isPdfExporting || timeEntryGroups.length === 0}
                                            title={isPdfExporting ? 'Exporteren naar PDF...' : `Exporteren naar PDF (${timeEntryGroups.length} ${viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'})`}
                                        >
                                            {!isPdfExporting && (
                                                <img
                                                    src="/images/pdf.webp"
                                                    alt="PDF export"
                                                    className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 object-contain"
                                                />
                                            )}
                                            {isPdfExporting && <div className="loading loading-spinner loading-sm"></div>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                                {currentGroups.map((group: TimeEntryGroup) => {
                                    const isExpanded = expandedGroups.has(group.groupKey);
                                    const userName = group.user?.fullName ||
                                        `${group.user?.firstName || ''} ${group.user?.lastName || ''}`.trim() || 'Onbekend';

                                    return (
                                        <div key={group.groupKey} className="border border-gray-200 rounded-lg sm:rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                            {/* Group Header */}
                                            <div className="p-4 sm:p-6 border-b border-gray-100">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                        <button
                                                            onClick={() => toggleGroupExpansion(group.groupKey)}
                                                            className="btn btn-ghost btn-sm p-1 sm:p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                                            ) : (
                                                                <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                                            )}
                                                        </button>

                                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                            <div className="avatar placeholder flex-shrink-0">
                                                                <div className="bg-gradient-elmar text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center">
                                                                    <span className="text-xs sm:text-sm font-bold">
                                                                        {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-800 truncate">{userName}</h3>
                                                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                                    📅 {group.displayName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 w-full sm:w-auto">
                                                        <div className="text-center">
                                                            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-elmar-primary">{group.entries.length}</p>
                                                            <p className="text-xs sm:text-sm text-gray-600">Dagen</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{group.totalHours.toFixed(1)}</p>
                                                            <p className="text-xs sm:text-sm text-gray-600">Uren</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <span className={`badge badge-sm sm:badge-md lg:badge-lg ${getStatusBadgeClass(group.status)}`}>
                                                                {group.status === 'mixed' ? 'Gemengd' : group.status}
                                                            </span>
                                                        </div>

                                                        {group.canApprove ? (
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <button
                                                                    className="btn btn-error btn-sm sm:btn-md rounded-lg hover:scale-105 transition-all duration-200 flex-1 sm:flex-none text-xs sm:text-sm"
                                                                    onClick={() => handleRejectGroup(group)}
                                                                    title={`${getViewTypeDisplayName(viewType)} afkeuren`}
                                                                >
                                                                    <XCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                    <span className="hidden sm:inline">Afkeuren</span>
                                                                </button>
                                                                <button
                                                                    className="btn btn-success btn-sm sm:btn-md rounded-lg hover:scale-105 transition-all duration-200 flex-1 sm:flex-none text-xs sm:text-sm"
                                                                    onClick={() => handleApproveGroup(group)}
                                                                    title={`${getViewTypeDisplayName(viewType)} goedkeuren`}
                                                                >
                                                                    <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                    <span className="hidden sm:inline">Goedkeuren</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {(() => {
                                                                    const filterStart = dayjs(startDate).startOf("day");
                                                                    const filterEnd = dayjs(endDate).endOf("day");
                                                                    const isCompletePeriodVisible = group.groupStart.isSameOrAfter(filterStart) &&
                                                                        group.groupEnd.isSameOrBefore(filterEnd);
                                                                    const hasSubmittedEntries = group.entries.some(e => e.status === 'ingeleverd');
                                                                    const hasProcessedEntries = group.entries.some(e => e.status === 'goedgekeurd' || e.status === 'afgekeurd');

                                                                    if (!isCompletePeriodVisible && (hasSubmittedEntries || hasProcessedEntries)) {
                                                                        return (
                                                                            <div className="flex items-center gap-2 text-orange-600">
                                                                                <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                                                <div className="tooltip tooltip-left" data-tip={`Volledige ${viewType === 'day' ? 'dag' : viewType === 'week' ? 'week' : 'maand'} niet zichtbaar in datumfilter. Pas het datumfilter aan om de hele periode te zien en goed te keuren.`}>
                                                                                    <span className="text-xs sm:text-sm font-medium cursor-help">Gedeeltelijk zichtbaar</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } else if (hasProcessedEntries) {
                                                                        const allApproved = group.entries.every(e => e.status === 'goedgekeurd');
                                                                        const allRejected = group.entries.every(e => e.status === 'afgekeurd');

                                                                        if (allApproved) {
                                                                            return (
                                                                                <div className="flex items-center gap-2 text-green-600">
                                                                                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                                                    <span className="text-xs sm:text-sm font-medium">Goedgekeurd</span>
                                                                                </div>
                                                                            );
                                                                        } else if (allRejected) {
                                                                            return (
                                                                                <div className="flex items-center gap-2 text-red-600">
                                                                                    <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                                                    <span className="text-xs sm:text-sm font-medium">Afgekeurd</span>
                                                                                </div>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <div className="flex items-center gap-2 text-blue-600">
                                                                                    <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                                                    <span className="text-xs sm:text-sm font-medium">Gemengd verwerkt</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    } else if (!hasSubmittedEntries) {
                                                                        return (
                                                                            <div className="flex items-center gap-2 text-gray-500">
                                                                                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                                                <span className="text-xs sm:text-sm font-medium">Niet ingediend</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Day Details */}
                                            {isExpanded && (
                                                <div className="p-4 sm:p-6 bg-gray-50">
                                                    <div className="overflow-x-auto">
                                                        <table className="table w-full text-xs sm:text-sm">
                                                            <thead>
                                                            <tr className="bg-white">
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">📅 Datum</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">🏢 Bedrijf</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">📁 Project</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">⏰ Start</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">⏰ Eind</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">⏱️ Uren</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">📊 Status</th>
                                                                <th className="text-gray-700 font-semibold text-xs sm:text-sm">⚙️ Acties</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {group.entries.map((entry: AdminExtendedTimeEntry) => {
                                                                const start = dayjs(entry.startTime);
                                                                const end = dayjs(entry.endTime);
                                                                const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                                                                const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
                                                                const companyName = entry.project?.projectGroup?.company?.name || 'Onbekend bedrijf';
                                                                const projectName = entry.project?.name || 'Onbekend project';

                                                                return (
                                                                    <tr key={entry.id} className="hover:bg-white transition-colors duration-150">
                                                                        <td className="font-medium">{start.format('DD-MM-YYYY')}</td>
                                                                        <td className="font-medium max-w-[100px] truncate" title={companyName}>{companyName}</td>
                                                                        <td className="font-medium text-elmar-primary max-w-[120px] truncate" title={projectName}>{projectName}</td>
                                                                        <td>{start.format('HH:mm')}</td>
                                                                        <td>{end.format('HH:mm')}</td>
                                                                        <td>
                                                                            <span className="badge badge-primary badge-sm">
                                                                                {hours} uur
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <span className={`badge badge-sm ${getStatusBadgeClass(entry.status || 'onbekend')}`}>
                                                                                {entry.status || 'onbekend'}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <button
                                                                                className="btn btn-sm btn-outline btn-primary rounded-lg hover:scale-105 transition-all duration-200"
                                                                                onClick={() => handleViewDetails(entry.id as number)}
                                                                                title="Details bekijken"
                                                                            >
                                                                                <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {currentGroups.length === 0 && (
                                    <div className="text-center py-8 sm:py-12">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="text-4xl sm:text-6xl">📅</div>
                                            <div className="text-lg sm:text-xl font-semibold text-gray-600">
                                                Geen {viewType === 'day' ? 'dagen' : viewType === 'week' ? 'weken' : 'maanden'} gevonden
                                            </div>
                                            <div className="text-sm sm:text-base text-gray-500">Probeer je filters aan te passen</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                                    <button
                                        className="btn btn-outline btn-primary btn-sm sm:btn-md rounded-lg sm:rounded-xl disabled:opacity-50 w-full sm:w-auto"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Vorige
                                    </button>

                                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`btn btn-sm rounded-lg flex-shrink-0 ${
                                                        pageNum === currentPage
                                                            ? 'btn-primary'
                                                            : 'btn-ghost hover:btn-outline'
                                                    }`}
                                                    onClick={() => goToPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        className="btn btn-outline btn-primary btn-sm sm:btn-md rounded-lg sm:rounded-xl disabled:opacity-50 w-full sm:w-auto"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Volgende
                                    </button>
                                </div>

                                <div className="text-center mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                                    Pagina <span className="font-semibold">{currentPage}</span> van <span className="font-semibold">{totalPages}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Report Section */}
                <MonthlyReportSection entries={entries} />

                {/* Details modal */}
                {showDetailsModal && selectedEntry && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-elmar-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Urenregistratie Details</h3>
                                <button
                                    className="btn btn-ghost btn-circle btn-sm sm:btn-md"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-3 sm:space-y-4">
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Medewerker</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">{selectedEntry.user?.fullName || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Datum</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">
                                            {dayjs(selectedEntry.startTime).format('DD MMMM YYYY')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Tijd</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">
                                            {dayjs(selectedEntry.startTime).format('HH:mm')} - {dayjs(selectedEntry.endTime).format('HH:mm')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Pauze</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">{selectedEntry.breakMinutes || 0} minuten</p>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Bedrijf</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">{selectedEntry.project?.projectGroup?.company?.name || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Project</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">{selectedEntry.project?.name || 'Onbekend'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Totaal uren</label>
                                        <p className="text-sm sm:text-base lg:text-lg font-medium">
                                            {(() => {
                                                const start = dayjs(selectedEntry.startTime);
                                                const end = dayjs(selectedEntry.endTime);
                                                const diffMin = end.diff(start, 'minute') - (selectedEntry.breakMinutes || 0);
                                                return diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
                                            })()} uur
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-semibold text-gray-600">Status</label>
                                        <div>
                                            <span className={`badge badge-sm sm:badge-md lg:badge-lg ${getStatusBadgeClass(selectedEntry.status || 'onbekend')}`}>
                                                {selectedEntry.status || 'onbekend'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedEntry.notes && (
                                <div className="mt-4 sm:mt-6">
                                    <label className="text-xs sm:text-sm font-semibold text-gray-600">Notities</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl mt-2">
                                        <p className="text-sm sm:text-base text-gray-800">{selectedEntry.notes}</p>
                                    </div>
                                </div>
                            )}

                            {(selectedEntry.distanceKm || selectedEntry.travelCosts || selectedEntry.expenses) && (
                                <div className="mt-4 sm:mt-6">
                                    <label className="text-xs sm:text-sm font-semibold text-gray-600">Aanvullende Kosten</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                        {selectedEntry.distanceKm && (
                                            <div>
                                                <span className="text-xs text-gray-500">Afstand</span>
                                                <p className="text-sm sm:text-base font-medium">{selectedEntry.distanceKm} km</p>
                                            </div>
                                        )}
                                        {selectedEntry.travelCosts && (
                                            <div>
                                                <span className="text-xs text-gray-500">Reiskosten</span>
                                                <p className="text-sm sm:text-base font-medium">€{selectedEntry.travelCosts.toFixed(2)}</p>
                                            </div>
                                        )}
                                        {selectedEntry.expenses && (
                                            <div>
                                                <span className="text-xs text-gray-500">Onkosten</span>
                                                <p className="text-sm sm:text-base font-medium">€{selectedEntry.expenses.toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedEntry.processedByUser && (
                                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl">
                                    <h4 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Verwerkingsinformatie</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500">Verwerkt door</span>
                                            <p className="text-sm sm:text-base font-medium">{selectedEntry.processedByUser.fullName}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">Verwerkt op</span>
                                            <p className="text-sm sm:text-base font-medium">
                                                {selectedEntry.processedDate ? dayjs(selectedEntry.processedDate).format('DD-MM-YYYY HH:mm') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedEntry.processingNotes && (
                                        <div className="mt-3">
                                            <span className="text-xs text-gray-500">Verwerkingsnotities</span>
                                            <p className="text-sm sm:text-base text-gray-800">{selectedEntry.processingNotes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reject Group Modal */}
                {showRejectModal && rejectingGroup && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-elmar-lg max-w-md w-full">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                                {getViewTypeDisplayName(rejectingGroup.groupType)} Afkeuren
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                                Weet u zeker dat u de hele {rejectingGroup.groupType === 'day' ? 'dag' : rejectingGroup.groupType === 'week' ? 'week' : 'maand'} voor <strong>{rejectingGroup.user.fullName}</strong> wilt afkeuren?
                                <br />
                                <span className="text-xs sm:text-sm text-gray-500">
                                    {rejectingGroup.groupType === 'day' ? 'Dag' : rejectingGroup.groupType === 'week' ? 'Week' : 'Maand'}: {rejectingGroup.displayName} ({rejectingGroup.entries.length} dagen)
                                </span>
                            </p>
                            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                                Geef een reden op waarom deze {rejectingGroup.groupType === 'day' ? 'dag' : rejectingGroup.groupType === 'week' ? 'week' : 'maand'} wordt afgekeurd. Deze reden wordt zichtbaar voor de medewerker.
                            </p>
                            <textarea
                                className="textarea textarea-bordered w-full h-24 sm:h-32 rounded-lg sm:rounded-xl text-sm"
                                placeholder={`Reden voor afkeuring van de hele ${rejectingGroup.groupType === 'day' ? 'dag' : rejectingGroup.groupType === 'week' ? 'week' : 'maand'}...`}
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                autoFocus
                            />
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <button
                                    className="btn btn-ghost btn-sm sm:btn-md rounded-lg sm:rounded-xl order-2 sm:order-1"
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectingGroup(null);
                                        setRejectionNotes("");
                                    }}
                                >
                                    Annuleren
                                </button>
                                <button
                                    className="btn btn-error btn-sm sm:btn-md rounded-lg sm:rounded-xl order-1 sm:order-2 text-xs sm:text-sm"
                                    onClick={confirmRejectGroup}
                                    disabled={!rejectionNotes.trim()}
                                >
                                    <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                                    {getViewTypeDisplayName(rejectingGroup.groupType)} Afkeuren
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}
