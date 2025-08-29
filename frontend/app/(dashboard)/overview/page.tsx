"use client";
import React, {useState, useEffect, useCallback, JSX} from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getTimeEntries } from "@/lib/api";
import { TimeEntry } from "@/lib/types";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    ClockIcon,
    CalendarDaysIcon,
    CurrencyEuroIcon,
    ChartBarIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";
import autoTable from "jspdf-autotable";

dayjs.extend(isBetween);

const PAGE_SIZE = 10;

export default function UrenOverzicht(): JSX.Element {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
    const [startDate, setStartDate] = useState<string>(dayjs().startOf("month").format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState<string>(dayjs().endOf("month").format("YYYY-MM-DD"));
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [selectedCompany, setSelectedCompany] = useState<string>("");
    const [projectOptions, setProjectOptions] = useState<string[]>([]);
    const [companyOptions, setCompanyOptions] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isPdfExporting, setIsPdfExporting] = useState(false);

    const safeToFixed = (value: any, decimals: number = 2): string => {
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            return value.toFixed(decimals);
        }
        return '0.' + '0'.repeat(decimals);
    };
    // Pdf export function
    const exportToPdf = async () => {
        setIsPdfExporting(true);

        try {
            // Add a small delay for UX
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create new PDF document (landscape for better table fit)
            const pdf = new jsPDF('l', 'mm', 'a4');

            // Set document properties
            pdf.setProperties({
                title: 'Goedgekeurde Urenregistraties Export',
                subject: 'Approved Time Entries Report',
                author: 'Elmar Timetracking System',
                creator: 'Elmar Timetracking System'
            });

            // Add title
            pdf.setFontSize(20);
            pdf.setTextColor(34, 197, 94); // Green color for approved hours
            pdf.text('Goedgekeurde Urenregistraties', 14, 20);

            // Add export info
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            const pdfDateRange = `${dayjs(startDate).format('DD-MM-YYYY')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            pdf.text(`Periode: ${pdfDateRange}`, 14, 30);
            pdf.text(`Geëxporteerd: ${dayjs().format('DD-MM-YYYY HH:mm')}`, 14, 35);
            pdf.text(`Aantal goedgekeurde registraties: ${filteredEntries.length}`, 14, 40);

            // Calculate totals
            const totalHours = filteredEntries.reduce((sum, entry) => {
                const start = dayjs(entry.startTime);
                const end = dayjs(entry.endTime);
                const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                const hours = diffMin > 0 ? diffMin / 60 : 0;
                return sum + hours;
            }, 0);

            const totalExpenses = filteredEntries.reduce((sum, entry) => {
                return sum + (entry.expenses || 0);
            }, 0);

            const totalDistance = filteredEntries.reduce((sum, entry) => {
                return sum + (entry.distanceKm || 0);
            }, 0);

            const uniqueDays = new Set(filteredEntries.map(entry =>
                dayjs(entry.startTime).format('YYYY-MM-DD')
            )).size;

            // Add summary totals
            pdf.text(`Totaal uren: ${safeToFixed(totalHours)}`, 14, 45);
            pdf.text(`Gewerkte dagen: ${uniqueDays}`, 14, 50);
            pdf.text(`Totaal onkosten: €${safeToFixed(totalExpenses)}`, 100, 45);
            pdf.text(`Totaal afstand: ${safeToFixed(totalDistance, 0)} km`, 100, 50);

            // Prepare table data (matching your Excel format)
            const tableData = filteredEntries.map(entry => {
                const start = dayjs(entry.startTime);
                const end = dayjs(entry.endTime);
                const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                const companyName = entry.project?.projectGroup?.company?.name || 'Onbekend bedrijf';
                const projectName = entry.project?.name || 'Onbekend project';

                return [
                    start.format('DD-MM-YYYY'),
                    start.format('HH:mm'),
                    end.format('HH:mm'),
                    (entry.breakMinutes || 0).toString(),
                    hours,
                    companyName,
                    projectName,
                    entry.notes || '',
                    'Goedgekeurd',
                    (entry.distanceKm || 0).toString(),
                    entry.travelCosts ? `€${entry.travelCosts.toFixed(2)}` : '€0.00',
                    entry.expenses ? `€${entry.expenses.toFixed(2)}` : '€0.00'
                ];
            });

            // Table headers
            const headers = [
                'Datum',
                'Start',
                'Eind',
                'Pauze (min)',
                'Uren',
                'Bedrijf',
                'Project',
                'Notities',
                'Status',
                'Afstand (km)',
                'Reiskosten',
                'Onkosten'
            ];

            // Add table to PDF using autoTable
            autoTable(pdf, {
                head: [headers],
                body: tableData,
                startY: 60,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [34, 197, 94], // Green header for approved hours
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [240, 253, 244] // Light green alternate rows
                },
                columnStyles: {
                    0: { cellWidth: 20 }, // Datum
                    1: { cellWidth: 15 }, // Start
                    2: { cellWidth: 15 }, // Eind
                    3: { cellWidth: 18 }, // Pauze
                    4: { cellWidth: 15 }, // Uren
                    5: { cellWidth: 35 }, // Bedrijf
                    6: { cellWidth: 35 }, // Project
                    7: { cellWidth: 40 }, // Notities
                    8: { cellWidth: 20 }, // Status
                    9: { cellWidth: 18 }, // Afstand
                    10: { cellWidth: 20 }, // Reiskosten
                    11: { cellWidth: 20 }  // Onkosten
                },
                margin: { top: 60, right: 14, bottom: 20, left: 14 },
                didDrawPage: function(data) {
                    // Add page numbers
                    const pageCount = (pdf as any).internal.getNumberOfPages();
                    pdf.setFontSize(8);
                    pdf.setTextColor(150);
                    for (let i = 1; i <= pageCount; i++) {
                        pdf.setPage(i);
                        pdf.text(`Pagina ${i} van ${pageCount}`,
                            (pdf as any).internal.pageSize.width - 30,
                            (pdf as any).internal.pageSize.height - 10
                        );
                    }
                }
            });

            // Add summary footer on last page
            const finalY = (pdf as any).lastAutoTable.finalY + 15;

            // Check if we need a new page for the summary
            const pageHeight = (pdf as any).internal.pageSize.height;
            if (finalY + 50 > pageHeight - 20) {
                pdf.addPage();
                pdf.setFontSize(14);
                pdf.setTextColor(34, 197, 94);
                pdf.text('Samenvatting Goedgekeurde Uren', 14, 30);

                pdf.setFontSize(11);
                pdf.setTextColor(0, 0, 0);
                pdf.text(`Periode: ${pdfDateRange}`, 14, 45);
                pdf.text(`Totaal goedgekeurde registraties: ${filteredEntries.length}`, 14, 55);
                pdf.text(`Totaal goedgekeurde uren: ${safeToFixed(totalHours)}`, 14, 65);
                pdf.text(`Aantal gewerkte dagen: ${uniqueDays}`, 14, 75);
                pdf.text(`Gemiddeld uren per dag: ${uniqueDays > 0 ? safeToFixed(totalHours / uniqueDays) : '0.00'}`, 14, 85);

                if (totalExpenses > 0) {
                    pdf.text(`Totaal onkosten: €${safeToFixed(totalExpenses)}`, 14, 95);
                }
                if (totalDistance > 0) {
                    pdf.text(`Totaal afstand: ${safeToFixed(totalDistance, 0)} km`, 14, 105);
                }
            } else {
                pdf.setFontSize(14);
                pdf.setTextColor(34, 197, 94);
                pdf.text('Samenvatting Goedgekeurde Uren', 14, finalY);

                pdf.setFontSize(11);
                pdf.setTextColor(0, 0, 0);
                pdf.text(`Periode: ${pdfDateRange}`, 14, finalY + 15);
                pdf.text(`Totaal goedgekeurde registraties: ${filteredEntries.length}`, 14, finalY + 25);
                pdf.text(`Totaal goedgekeurde uren: ${safeToFixed(totalHours)}`, 14, finalY + 35);
                pdf.text(`Aantal gewerkte dagen: ${uniqueDays}`, 14, finalY + 45);
                pdf.text(`Gemiddeld uren per dag: ${uniqueDays > 0 ? safeToFixed(totalHours / uniqueDays) : '0.00'}`, 14, finalY + 55);

                if (totalExpenses > 0) {
                    pdf.text(`Totaal onkosten: €${safeToFixed(totalExpenses)}`, 14, finalY + 65);
                }
                if (totalDistance > 0) {
                    pdf.text(`Totaal afstand: ${safeToFixed(totalDistance, 0)} km`, 14, finalY + 75);
                }
            }

            // Generate filename
            const filenameDateRange = `${dayjs(startDate).format('DD-MM')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            const filename = `Goedgekeurde_Uren_${filenameDateRange.replace(/\//g, '-')}_${dayjs().format('HH-mm')}.pdf`;

            // Save the PDF
            pdf.save(filename);

            // Show success message
            console.log(`PDF bestand "${filename}" gedownload (${filteredEntries.length} goedgekeurde registraties)`);

        } catch (error) {
            console.error('Error exporting to PDF:', error);
            // You might want to show an error toast here if you have toast notifications
        } finally {
            setIsPdfExporting(false);
        }
    };

    // Excel export function
    const exportToExcel = async () => {
        setIsExporting(true);

        try {
            // Add a small delay for UX
            await new Promise(resolve => setTimeout(resolve, 500));

            // Transform the filtered entries into Excel-friendly format
            const excelData = filteredEntries.map((entry: TimeEntry) => {
                const start = dayjs(entry.startTime);
                const end = dayjs(entry.endTime);
                const diffMin = end.diff(start, 'minute') - (entry.breakMinutes || 0);
                const hours = diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";

                const companyName = entry.project?.projectGroup?.company?.name || 'Onbekend bedrijf';
                const projectName = entry.project?.name || 'Onbekend project';

                return {
                    'Datum': start.format('DD-MM-YYYY'),
                    'Starttijd': start.format('HH:mm'),
                    'Eindtijd': end.format('HH:mm'),
                    'Pauze (min)': entry.breakMinutes || 0,
                    'Totaal Uren': parseFloat(hours),
                    'Bedrijf': companyName,
                    'Project': projectName,
                    'Notities': entry.notes || '',
                    'Status': 'Goedgekeurd',
                    'Afstand (km)': entry.distanceKm || 0,
                    'Reiskosten (€)': entry.travelCosts || 0,
                    'Onkosten (€)': entry.expenses || 0
                };
            });

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();

            // Calculate totals for summary
            const totalHours = excelData.reduce((sum, entry) => sum + entry['Totaal Uren'], 0);
            const totalExpenses = excelData.reduce((sum, entry) => {
                const expenses = entry['Onkosten (€)'];
                return sum + (typeof expenses === 'number' ? expenses : 0);
            }, 0);
            const totalDistance = excelData.reduce((sum, entry) => {
                const distance = entry['Afstand (km)'];
                return sum + (typeof distance === 'number' ? distance : 0);
            }, 0);
            const uniqueDays = new Set(excelData.map(entry => entry['Datum'])).size;

            // Add summary row at the top
            const summaryData = [
                {
                    'Datum': 'SAMENVATTING GOEDGEKEURDE UREN',
                    'Starttijd': `${excelData.length} registraties`,
                    'Eindtijd': `${uniqueDays} dagen`,
                    'Pauze (min)': '',
                    'Totaal Uren': `${totalHours.toFixed(2)} uur`,
                    'Bedrijf': `€${totalExpenses.toFixed(2)} onkosten`,
                    'Project': `${totalDistance.toFixed(0)} km`,
                    'Notities': `Periode: ${dayjs(startDate).format('DD-MM-YYYY')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`,
                    'Status': `Geëxporteerd: ${dayjs().format('DD-MM-YYYY HH:mm')}`,
                    'Afstand (km)': '',
                    'Reiskosten (€)': '',
                    'Onkosten (€)': ''
                },
                {}, // Empty row
                ...excelData
            ];

            const worksheet = XLSX.utils.json_to_sheet(summaryData);

            // Set column widths for better readability
            const columnWidths = [
                { wch: 12 }, // Datum
                { wch: 10 }, // Starttijd
                { wch: 10 }, // Eindtijd
                { wch: 12 }, // Pauze
                { wch: 12 }, // Totaal Uren
                { wch: 25 }, // Bedrijf
                { wch: 25 }, // Project
                { wch: 30 }, // Notities
                { wch: 15 }, // Status
                { wch: 12 }, // Afstand
                { wch: 12 }, // Reiskosten
                { wch: 12 }  // Onkosten
            ];
            worksheet['!cols'] = columnWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Goedgekeurde Uren');

            // Generate filename with current date and filter info
            const dateRange = `${dayjs(startDate).format('DD-MM')} tot ${dayjs(endDate).format('DD-MM-YYYY')}`;
            const filename = `Goedgekeurde_Uren_${dateRange.replace(/\//g, '-')}_${dayjs().format('HH-mm')}.xlsx`;

            // Write and download the file
            XLSX.writeFile(workbook, filename);

            // You might want to show a toast notification here if you have one
            console.log(`Excel bestand "${filename}" gedownload (${excelData.length} goedgekeurde registraties)`);

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            // You might want to show an error toast here
        } finally {
            setIsExporting(false);
        }
    };

    const filterData = useCallback(() => {
        try {
            const start = dayjs(startDate).startOf("day");
            const end = dayjs(endDate).endOf("day");

            let result: TimeEntry[] = [];
            for (const entry of entries) {
                try {
                    // FILTER: Only show approved entries
                    if (entry.status !== "goedgekeurd") {
                        continue;
                    }

                    const entryDate = dayjs(entry.startTime);
                    if (entryDate.isBetween(start, end, "day", "[]")) {
                        result.push(entry);
                    }
                } catch (error) {
                    console.warn('Date filtering error for entry:', entry, error);
                }
            }

            if (selectedProject) {
                const temp: TimeEntry[] = [];
                for (const entry of result) {
                    if (entry.project?.name === selectedProject) {
                        temp.push(entry);
                    }
                }
                result = temp;
            }

            if (selectedCompany) {
                const temp: TimeEntry[] = [];
                for (const entry of result) {
                    if (entry.project?.projectGroup?.company?.name === selectedCompany) {
                        temp.push(entry);
                    }
                }
                result = temp;
            }

            if (searchTerm) {
                const temp: TimeEntry[] = [];
                const searchLower = searchTerm.toLowerCase();
                for (const entry of result) {
                    const projectName = entry.project?.name?.toLowerCase() || '';
                    const companyName = entry.project?.projectGroup?.company?.name?.toLowerCase() || '';
                    const notes = entry.notes?.toLowerCase() || '';

                    if (projectName.includes(searchLower) ||
                        companyName.includes(searchLower) ||
                        notes.includes(searchLower)) {
                        temp.push(entry);
                    }
                }
                result = temp;
            }

            setFilteredEntries(result);
            setCurrentPage(1);
        } catch (error) {
            console.error('Filter data error:', error);
            setFilteredEntries([]);
        }
    }, [entries, startDate, endDate, selectedProject, selectedCompany, searchTerm]);

    useEffect(() => {
        async function fetchData(): Promise<void> {
            try {
                const data = await getTimeEntries();
                let safeData: TimeEntry[] = [];
                if (Array.isArray(data)) {
                    safeData = data;
                }
                setEntries(safeData);
            } catch (error) {
                console.error("Fout bij ophalen van time entries:", error);
                setEntries([]);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        try {
            const projectsSet = new Set<string>();
            const companiesSet = new Set<string>();

            for (const entry of entries) {
                try {
                    // Only get options from approved entries
                    if (entry && entry.status === "goedgekeurd" && entry.project && entry.project.name) {
                        projectsSet.add(entry.project.name);
                    }
                    const compName = entry?.project?.projectGroup?.company?.name;
                    if (entry && entry.status === "goedgekeurd" && compName) {
                        companiesSet.add(compName);
                    }
                } catch (error) {
                    console.warn('Error processing entry for options:', entry, error);
                }
            }

            setProjectOptions(Array.from(projectsSet));
            setCompanyOptions(Array.from(companiesSet));
        } catch (error) {
            console.error('Error setting options:', error);
            setProjectOptions([]);
            setCompanyOptions([]);
        }
    }, [entries]);

    useEffect(() => {
        filterData();
    }, [entries, startDate, endDate, selectedProject, selectedCompany, searchTerm, filterData]);

    // Calculate statistics - ONLY for approved entries
    let totalHours = 0;
    let totalDays = 0;
    let totalExpenses = 0;
    let totalDistance = 0;
    const daysWithHours = new Set<string>();

    for (const entry of filteredEntries) {
        try {
            if (!entry || !entry.startTime || !entry.endTime || entry.status !== "goedgekeurd") continue;
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            if (diffMin > 0) {
                totalHours += diffMin / 60;
                daysWithHours.add(start.format("YYYY-MM-DD"));
            }
            totalExpenses += entry.expenses || 0;
            totalDistance += entry.distanceKm || 0;
        } catch (error) {
            console.warn('Error calculating stats for entry:', entry, error);
        }
    }
    totalDays = daysWithHours.size;

    const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
    const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
    const pageEntries = filteredEntries.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);

    function goToPage(page: number): void {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        setCurrentPage(page);
    }

    const resetFilters = (): void => {
        setStartDate(dayjs().startOf("month").format("YYYY-MM-DD"));
        setEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
        setSelectedProject("");
        setSelectedCompany("");
        setSearchTerm("");
    };

    return (
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircleIcon className="w-8 h-8" />
                    <h1 className="text-4xl font-bold">Goedgekeurde Uren</h1>
                </div>
                <p className="text-blue-100 text-lg">Overzicht van alle goedgekeurde werkuren</p>
            </div>

            {/* Statistics Cards - ONLY APPROVED HOURS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-success text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">✅ Goedgekeurde Uren</p>
                            <p className="text-3xl font-bold">{safeToFixed(totalHours)}</p>
                        </div>
                        <ClockIcon className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Gewerkte Dagen</p>
                            <p className="text-3xl font-bold">{totalDays}</p>
                        </div>
                        <CalendarDaysIcon className="w-12 h-12 text-purple-200" />
                    </div>
                </div>

                <div className="bg-gradient-warning text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm font-medium">Onkosten</p>
                            <p className="text-3xl font-bold">€{safeToFixed(totalExpenses)}</p>
                        </div>
                        <CurrencyEuroIcon className="w-12 h-12 text-yellow-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-6 shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Afstand (km)</p>
                            <p className="text-3xl font-bold">{safeToFixed(totalDistance, 0)}</p>
                        </div>
                        <ChartBarIcon className="w-12 h-12 text-indigo-200" />
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                <div className="card-body p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <FunnelIcon className="w-6 h-6 text-elmar-primary" />
                        <h2 className="text-2xl font-bold text-gray-800">Filters & Zoeken</h2>
                        <span className="badge badge-success">Alleen goedgekeurde uren</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">📅 Startdatum</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">📅 Einddatum</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">🏢 Bedrijf</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                            >
                                <option value="">Alle bedrijven</option>
                                {companyOptions.map((comp, index) => (
                                    <option key={comp || index} value={comp}>
                                        {comp}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-gray-700">📁 Project</span>
                            </label>
                            <select
                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="">Alle projecten</option>
                                {projectOptions.map((proj, index) => (
                                    <option key={proj || index} value={proj}>
                                        {proj}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="form-control mt-6">
                        <label className="label">
                            <span className="label-text font-semibold text-gray-700">🔍 Zoeken</span>
                        </label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Zoek op project, bedrijf of notities..."
                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold">{filteredEntries.length}</span> goedgekeurde entries van <span className="font-semibold">{entries.filter(e => e.status === "goedgekeurd").length}</span> totaal
                        </div>
                        <button
                            className="btn btn-outline btn-primary rounded-xl hover:scale-105 transition-all duration-200"
                            onClick={resetFilters}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Table */}
            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                <div className="card-body p-0">
                    <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <EyeIcon className="w-6 h-6 text-elmar-primary" />
                                <h2 className="text-2xl font-bold text-gray-800">Goedgekeurde Urenregistraties</h2>
                                <span className="badge badge-success">{filteredEntries.length} items</span>
                            </div>
                            <div className="flex items-center gap-3 pr-5 ml-auto">
                                <h2 className="text-2xl font-bold text-gray-800">Exporteren</h2>
                            </div>
                            <div className="flex gap-2">
                                {/* Excel Export Button */}
                                <button
                                    className={`btn btn-ghost p-2 rounded-xl hover:scale-105 transition-all duration-200 hover:bg-green-50 ${isExporting ? 'loading' : ''}`}
                                    onClick={exportToExcel}
                                    disabled={isExporting || filteredEntries.length === 0}
                                    title={isExporting ? 'Exporteren naar Excel...' : `Exporteren naar Excel (${filteredEntries.length} items)`}
                                >
                                    {!isExporting && (
                                        <img
                                            src="/images/excel.webp"
                                            alt="Excel export"
                                            className="w-6 h-6 object-contain"
                                        />
                                    )}
                                    {isExporting && <div className="loading loading-spinner loading-sm"></div>}
                                </button>

                                {/* PDF Export Button */}
                                <button
                                    className={`btn btn-ghost p-2 rounded-xl hover:scale-105 transition-all duration-200 hover:bg-red-50 ${isPdfExporting ? 'loading' : ''}`}
                                    onClick={exportToPdf}
                                    disabled={isPdfExporting || filteredEntries.length === 0}
                                    title={isPdfExporting ? 'Exporteren naar PDF...' : `Exporteren naar PDF (${filteredEntries.length} items)`}
                                >
                                    {!isPdfExporting && (
                                        <img
                                            src="/images/pdf.webp"
                                            alt="PDF export"
                                            className="w-6 h-6 object-contain"
                                        />
                                    )}
                                    {isPdfExporting && <div className="loading loading-spinner loading-sm"></div>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="text-gray-700 font-semibold">📅 Datum</th>
                                <th className="text-gray-700 font-semibold">⏰ Start</th>
                                <th className="text-gray-700 font-semibold">⏰ Eind</th>
                                <th className="text-gray-700 font-semibold">⏱️ Uren</th>
                                <th className="text-gray-700 font-semibold">🏢 Bedrijf</th>
                                <th className="text-gray-700 font-semibold">📁 Project</th>
                                <th className="text-gray-700 font-semibold">📝 Notities</th>
                                <th className="text-gray-700 font-semibold">✅ Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageEntries.map((entry, index) => {
                                try {
                                    const start = dayjs(entry.startTime);
                                    const end = dayjs(entry.endTime);
                                    const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                                    const hours = diffMin > 0 ? (diffMin / 60) : 0;

                                    return (
                                        <tr key={entry.id || index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="font-medium">{start.format("DD-MM-YYYY")}</td>
                                            <td>{start.format("HH:mm")}</td>
                                            <td>{end.format("HH:mm")}</td>
                                            <td>
                                                    <span className="badge badge-success badge-lg font-semibold">
                                                        {safeToFixed(hours)} uur
                                                    </span>
                                            </td>
                                            <td className="font-medium text-gray-800">
                                                {entry.project?.projectGroup?.company?.name || "Onbekend bedrijf"}
                                            </td>
                                            <td className="font-medium text-elmar-primary">
                                                {entry.project?.name || "Onbekend project"}
                                            </td>
                                            <td className="text-gray-600 italic">
                                                {entry.notes || "Geen notities"}
                                            </td>
                                            <td>
                                                <span className="badge badge-success">
                                                    ✅ Goedgekeurd
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                } catch (error) {
                                    console.warn('Error rendering entry:', entry, error);
                                    return (
                                        <tr key={index}>
                                            <td colSpan={8} className="text-center text-error">Error loading entry</td>
                                        </tr>
                                    );
                                }
                            })}

                            {pageEntries.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="text-6xl">✅</div>
                                            <div className="text-xl font-semibold text-gray-600">Geen goedgekeurde uren gevonden</div>
                                            <div className="text-gray-500">Probeer je filters aan te passen of wacht tot uren zijn goedgekeurd</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Enhanced Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                            <div className="flex justify-center items-center gap-4">
                                <button
                                    className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Vorige
                                </button>

                                <div className="flex items-center gap-2">
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
                                                className={`btn btn-sm rounded-lg ${
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
                                    className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Volgende
                                </button>
                            </div>

                            <div className="text-center mt-3 text-sm text-gray-600">
                                Pagina <span className="font-semibold">{currentPage}</span> van <span className="font-semibold">{totalPages}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
