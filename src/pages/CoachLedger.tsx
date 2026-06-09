import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
  BookOpen,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  TrendingUp,
  ChevronRight,
  Settings,
  Search,
  Download,
  BarChart3,
  Calendar,
  DollarSign,
  User,
  ArrowLeft,
  X,
  Save,
} from 'lucide-react';
import Modal from '@/components/Modal';

type TabType = 'overview' | 'daily' | 'weekly' | 'salary' | 'rates';

const getCourseName = (c: string) =>
  ({ subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' }[c] || c);

const getCourseColor = (c: string) =>
  ({
    subject1: 'bg-blue-100 text-blue-700',
    subject2: 'bg-green-100 text-green-700',
    subject3: 'bg-purple-100 text-purple-700',
    subject4: 'bg-orange-100 text-orange-700',
  }[c] || 'bg-gray-100 text-gray-700');

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function CoachLedger() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null);
  const [selectedCoachName, setSelectedCoachName] = useState<string>('');

  const [todayOverview, setTodayOverview] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [dailyDate, setDailyDate] = useState(formatToday());
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [weeklyDate, setWeeklyDate] = useState(formatToday());
  const [salaryData, setSalaryData] = useState<any>(null);
  const [salaryStart, setSalaryStart] = useState(getMonthStart());
  const [salaryEnd, setSalaryEnd] = useState(formatToday());
  const [ratesData, setRatesData] = useState<any[]>([]);
  const [editRates, setEditRates] = useState<any[]>([]);
  const [showRatesModal, setShowRatesModal] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCoaches();
    loadTodayOverview();
  }, []);

  const loadCoaches = async () => {
    try {
      const res: any = await api.get('/coaches');
      if (res.success) setCoaches(res.data);
    } catch (e) {}
  };

  const loadTodayOverview = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/coach-ledger/overview/today');
      if (res.success) setTodayOverview(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadDaily = async (coachId: number, date: string) => {
    try {
      setLoading(true);
      const res: any = await api.get(`/coach-ledger/daily/${coachId}?date=${date}`);
      if (res.success) setDailyData(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadWeekly = async (coachId: number, date: string) => {
    try {
      setLoading(true);
      const res: any = await api.get(`/coach-ledger/weekly/${coachId}?date=${date}`);
      if (res.success) setWeeklyData(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadSalary = async (coachId: number, start: string, end: string) => {
    try {
      setLoading(true);
      const res: any = await api.get(
        `/coach-ledger/salary/${coachId}?start_date=${start}&end_date=${end}`
      );
      if (res.success) setSalaryData(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadRates = async (coachId: number) => {
    try {
      const res: any = await api.get(`/coach-ledger/rates/${coachId}`);
      if (res.success) {
        setRatesData(res.data);
        setEditRates(res.data.map((r: any) => ({ ...r })));
      }
    } catch (e) {}
  };

  const handleSelectCoach = (coach: any) => {
    setSelectedCoach(coach.id);
    setSelectedCoachName(coach.name || coach.coach_name);
  };

  const handleEnterCoachDetail = (coach: any) => {
    handleSelectCoach(coach);
    setActiveTab('daily');
    loadDaily(coach.id, dailyDate);
    loadWeekly(coach.id, weeklyDate);
    loadSalary(coach.id, salaryStart, salaryEnd);
    loadRates(coach.id);
  };

  const handleBackToOverview = () => {
    setSelectedCoach(null);
    setSelectedCoachName('');
    setActiveTab('overview');
    setDailyData(null);
    setWeeklyData(null);
    setSalaryData(null);
    setRatesData([]);
  };

  const handleSaveRates = async () => {
    if (!selectedCoach) return;
    try {
      const res: any = await api.put(`/coach-ledger/rates/${selectedCoach}`, {
        rates: editRates.map((r) => ({
          course_type: r.course_type,
          hourly_rate: Number(r.hourly_rate) || 0,
        })),
      });
      if (res.success) {
        setRatesData(res.data);
        setShowRatesModal(false);
        alert('课时费配置已更新');
        if (selectedCoach && activeTab === 'daily') loadDaily(selectedCoach, dailyDate);
        if (selectedCoach && activeTab === 'weekly') loadWeekly(selectedCoach, weeklyDate);
        if (selectedCoach && activeTab === 'salary') loadSalary(selectedCoach, salaryStart, salaryEnd);
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  const exportSalaryCSV = () => {
    if (!salaryData) return;
    const rows = [
      ['日期', '带班班次', '授课人次', '授课次数', '累计学时(小时)', '当日薪资(元)'],
      ...salaryData.daily_list.map((d: any) => [
        d.work_date,
        d.class_count,
        d.student_count,
        d.session_count,
        d.total_hours,
        d.total_salary,
      ]),
      [
        '合计',
        salaryData.summary.class_count,
        salaryData.summary.student_count,
        salaryData.summary.session_count,
        salaryData.summary.total_hours,
        salaryData.summary.total_salary,
      ],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCoachName}_薪资报表_${salaryData.start_date}_${salaryData.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'overview', label: '今日概览', icon: BarChart3 },
    { key: 'daily', label: '每日台账', icon: Calendar },
    { key: 'weekly', label: '每周台账', icon: CalendarDays },
    { key: 'salary', label: '薪资报表', icon: Wallet },
    { key: 'rates', label: '课时费配置', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
              <BookOpen className="text-teal-500" /> 教练工作台账
            </h2>
            {selectedCoach && (
              <button
                onClick={handleBackToOverview}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft size={14} /> 返回概览
              </button>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            自动汇总教练每日、每周授课人次、累计学时、带班班次，生成个人工作台账及薪资报表
            {selectedCoachName && (
              <span className="ml-2 text-primary font-medium">当前: {selectedCoachName}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key !== 'overview' && selectedCoach) {
                if (t.key === 'daily') loadDaily(selectedCoach, dailyDate);
                if (t.key === 'weekly') loadWeekly(selectedCoach, weeklyDate);
                if (t.key === 'salary') loadSalary(selectedCoach, salaryStart, salaryEnd);
                if (t.key === 'rates') loadRates(selectedCoach);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all text-sm font-medium ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      )}

      {activeTab === 'overview' && (
        <OverviewSection
          data={todayOverview}
          coaches={coaches}
          onEnterCoach={handleEnterCoachDetail}
        />
      )}

      {activeTab === 'daily' && selectedCoach && (
        <DailySection
          data={dailyData}
          coaches={coaches}
          selectedCoach={selectedCoach}
          date={dailyDate}
          onCoachChange={(id) => {
            const coach = coaches.find((c) => c.id === id);
            if (coach) handleSelectCoach(coach);
            loadDaily(id, dailyDate);
          }}
          onDateChange={(d) => {
            setDailyDate(d);
            loadDaily(selectedCoach, d);
          }}
        />
      )}

      {activeTab === 'daily' && !selectedCoach && (
        <EmptyCoachList coaches={coaches} onSelect={handleEnterCoachDetail} title="请选择教练查看每日台账" />
      )}

      {activeTab === 'weekly' && selectedCoach && (
        <WeeklySection
          data={weeklyData}
          coaches={coaches}
          selectedCoach={selectedCoach}
          date={weeklyDate}
          onCoachChange={(id) => {
            const coach = coaches.find((c) => c.id === id);
            if (coach) handleSelectCoach(coach);
            loadWeekly(id, weeklyDate);
          }}
          onDateChange={(d) => {
            setWeeklyDate(d);
            loadWeekly(selectedCoach, d);
          }}
        />
      )}

      {activeTab === 'weekly' && !selectedCoach && (
        <EmptyCoachList coaches={coaches} onSelect={handleEnterCoachDetail} title="请选择教练查看每周台账" />
      )}

      {activeTab === 'salary' && selectedCoach && (
        <SalarySection
          data={salaryData}
          coaches={coaches}
          selectedCoach={selectedCoach}
          startDate={salaryStart}
          endDate={salaryEnd}
          onCoachChange={(id) => {
            const coach = coaches.find((c) => c.id === id);
            if (coach) handleSelectCoach(coach);
            loadSalary(id, salaryStart, salaryEnd);
          }}
          onStartChange={(d) => {
            setSalaryStart(d);
            loadSalary(selectedCoach, d, salaryEnd);
          }}
          onEndChange={(d) => {
            setSalaryEnd(d);
            loadSalary(selectedCoach, salaryStart, d);
          }}
          onExport={exportSalaryCSV}
        />
      )}

      {activeTab === 'salary' && !selectedCoach && (
        <EmptyCoachList coaches={coaches} onSelect={handleEnterCoachDetail} title="请选择教练查看薪资报表" />
      )}

      {activeTab === 'rates' && selectedCoach && (
        <RatesSection
          data={ratesData}
          coaches={coaches}
          selectedCoach={selectedCoach}
          onCoachChange={(id) => {
            const coach = coaches.find((c) => c.id === id);
            if (coach) handleSelectCoach(coach);
            loadRates(id);
          }}
          onEdit={() => {
            setEditRates(ratesData.map((r) => ({ ...r })));
            setShowRatesModal(true);
          }}
        />
      )}

      {activeTab === 'rates' && !selectedCoach && (
        <EmptyCoachList coaches={coaches} onSelect={handleEnterCoachDetail} title="请选择教练配置课时费" />
      )}

      <Modal
        isOpen={showRatesModal}
        title={`${selectedCoachName} - 课时费配置`}
        onClose={() => setShowRatesModal(false)}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            {editRates.map((r, i) => (
              <div key={r.course_type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-medium ${getCourseColor(r.course_type)}`}
                >
                  {r.course_name}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">课时费:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={r.hourly_rate}
                    onChange={(e) => {
                      const copy = [...editRates];
                      copy[i] = { ...r, hourly_rate: e.target.value };
                      setEditRates(copy);
                    }}
                    className="w-24 px-3 py-1.5 border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">元/小时</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => setShowRatesModal(false)}
              className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSaveRates}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm flex items-center gap-1"
            >
              <Save size={14} /> 保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: any;
  label: string;
  value: any;
  subValue?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    teal: 'from-teal-500 to-teal-600',
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}
        >
          <Icon size={20} />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
      {subValue && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{subValue}</div>}
    </div>
  );
}

function OverviewSection({
  data,
  coaches,
  onEnterCoach,
}: {
  data: any;
  coaches: any[];
  onEnterCoach: (c: any) => void;
}) {
  if (!data)
    return <div className="text-center py-12 text-[var(--text-secondary)]">暂无数据</div>;

  const list = data.list || [];
  const totalStudents = list.reduce((s: number, c: any) => s + c.student_count, 0);
  const totalHours = list.reduce((s: number, c: any) => s + c.total_hours, 0);
  const totalClasses = list.reduce((s: number, c: any) => s + c.class_count, 0);
  const totalSalary = list.reduce((s: number, c: any) => s + c.today_salary, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <StatCard icon={User} label="在岗教练" value={list.length} color="teal" />
        <StatCard icon={Users} label="今日授课人次" value={totalStudents} color="blue" />
        <StatCard icon={Clock} label="今日累计学时" value={totalHours.toFixed(2)} subValue="小时" color="orange" />
        <StatCard icon={CalendarDays} label="今日带班班次" value={totalClasses} color="purple" />
        <StatCard
          icon={Wallet}
          label="今日薪资合计"
          value={`¥${totalSalary.toFixed(2)}`}
          color="green"
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[var(--text)] flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-500" /> 今日教练工作明细 - {data.date}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">教练</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">联系电话</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">带班班次</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课人次</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课次数</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时(小时)</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">预估薪资</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--text-secondary)]">
                    暂无数据
                  </td>
                </tr>
              ) : (
                list.map((c: any) => (
                  <tr
                    key={c.coach_id}
                    className="border-b border-[var(--border)]/50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                          {c.coach_name?.charAt(0)}
                        </div>
                        <span className="font-medium text-[var(--text)]">{c.coach_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-purple-600">{c.class_count}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-blue-600">{c.student_count}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{c.session_count}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-orange-600">{c.total_hours.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-green-600">¥{c.today_salary.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onEnterCoach(c)}
                        className="text-primary hover:underline text-xs flex items-center gap-1 justify-center mx-auto"
                      >
                        查看详情 <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DailySection({
  data,
  coaches,
  selectedCoach,
  date,
  onCoachChange,
  onDateChange,
}: {
  data: any;
  coaches: any[];
  selectedCoach: number;
  date: string;
  onCoachChange: (id: number) => void;
  onDateChange: (d: string) => void;
}) {
  if (!data)
    return (
      <div className="space-y-4">
        <FiltersBar
          coaches={coaches}
          selectedCoach={selectedCoach}
          onCoachChange={onCoachChange}
          date={date}
          onDateChange={onDateChange}
          dateLabel="选择日期"
        />
        <div className="text-center py-12 text-[var(--text-secondary)]">暂无数据</div>
      </div>
    );

  const s = data.summary;
  return (
    <div className="space-y-6">
      <FiltersBar
        coaches={coaches}
        selectedCoach={selectedCoach}
        onCoachChange={onCoachChange}
        date={date}
        onDateChange={onDateChange}
        dateLabel="选择日期"
      />

      <div className="grid grid-cols-6 gap-4">
        <StatCard icon={Users} label="授课人次" value={s.student_count} color="blue" />
        <StatCard icon={BarChart3} label="授课次数" value={s.session_count} color="purple" />
        <StatCard icon={CalendarDays} label="带班班次" value={s.class_count} color="pink" />
        <StatCard icon={Clock} label="实际学时" value={s.total_hours.toFixed(2)} subValue="小时" color="orange" />
        <StatCard icon={Calendar} label="计划学时" value={s.scheduled_hours.toFixed(2)} subValue="小时" color="teal" />
        <StatCard
          icon={DollarSign}
          label="当日薪资"
          value={`¥${s.total_salary.toFixed(2)}`}
          color="green"
        />
      </div>

      {data.by_course?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
          <h3 className="font-medium text-[var(--text)] mb-4">分科目明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课人次</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课次数</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">课时费率</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">薪资小计</th>
                </tr>
              </thead>
              <tbody>
                {data.by_course.map((c: any) => (
                  <tr key={c.course_type} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getCourseColor(c.course_type)}`}>
                        {c.course_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{c.student_count}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{c.session_count}</td>
                    <td className="py-3 px-4 text-center font-medium text-orange-600">{c.total_hours.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">¥{c.hourly_rate}/h</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-green-600">¥{c.salary.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.schedules?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
          <h3 className="font-medium text-[var(--text)] mb-4">当日排班</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">时间段</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">计划人数</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">已预约</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">状态</th>
                </tr>
              </thead>
              <tbody>
                {data.schedules.map((s: any) => (
                  <tr key={s.id} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4 font-medium text-[var(--text)]">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${getCourseColor(s.course_type)}`}>
                        {getCourseName(s.course_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{s.max_students}</td>
                    <td className="py-3 px-4 text-center font-medium text-blue-600">{s.booking_count}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          s.status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'full'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {s.status === 'available' ? '可预约' : s.status === 'full' ? '已满' : '已取消'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklySection({
  data,
  coaches,
  selectedCoach,
  date,
  onCoachChange,
  onDateChange,
}: {
  data: any;
  coaches: any[];
  selectedCoach: number;
  date: string;
  onCoachChange: (id: number) => void;
  onDateChange: (d: string) => void;
}) {
  if (!data)
    return (
      <div className="space-y-4">
        <FiltersBar
          coaches={coaches}
          selectedCoach={selectedCoach}
          onCoachChange={onCoachChange}
          date={date}
          onDateChange={onDateChange}
          dateLabel="选择周内日期"
        />
        <div className="text-center py-12 text-[var(--text-secondary)]">暂无数据</div>
      </div>
    );

  const s = data.summary;
  const maxHours = Math.max(...data.daily_stats.map((d: any) => d.total_hours), 1);

  return (
    <div className="space-y-6">
      <FiltersBar
        coaches={coaches}
        selectedCoach={selectedCoach}
        onCoachChange={onCoachChange}
        date={date}
        onDateChange={onDateChange}
        dateLabel="选择周内日期"
      />

      <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100">
        <div className="text-sm text-[var(--text-secondary)] mb-1">本周统计周期</div>
        <div className="text-lg font-bold text-[var(--text)]">
          {data.week_start} 至 {data.week_end}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatCard icon={CalendarDays} label="出勤天数" value={`${s.work_days}/7`} color="teal" />
        <StatCard icon={Users} label="授课人次" value={s.student_count} color="blue" />
        <StatCard icon={BarChart3} label="授课次数" value={s.session_count} color="purple" />
        <StatCard icon={Calendar} label="带班班次" value={s.class_count} color="pink" />
        <StatCard icon={Clock} label="累计学时" value={s.total_hours.toFixed(2)} subValue="小时" color="orange" />
        <StatCard
          icon={Wallet}
          label="本周薪资"
          value={`¥${s.total_salary.toFixed(2)}`}
          color="green"
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <h3 className="font-medium text-[var(--text)] mb-4">每日学时分布</h3>
        <div className="space-y-3">
          {data.daily_stats.map((d: any) => (
            <div key={d.work_date} className="flex items-center gap-3">
              <div className="w-20 text-sm">
                <div className="font-medium text-[var(--text)]">{d.weekday}</div>
                <div className="text-xs text-[var(--text-secondary)]">{d.work_date.substring(5)}</div>
              </div>
              <div className="flex-1">
                <div className="h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all"
                    style={{ width: `${(d.total_hours / maxHours) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="text-xs text-[var(--text-secondary)]">
                  {d.student_count}人 · {d.session_count}次
                </div>
                <div className="font-medium text-orange-600">{d.total_hours.toFixed(2)}h</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.by_course?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
          <h3 className="font-medium text-[var(--text)] mb-4">分科目汇总</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课人次</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课次数</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">课时费率</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">薪资小计</th>
                </tr>
              </thead>
              <tbody>
                {data.by_course.map((c: any) => (
                  <tr key={c.course_type} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getCourseColor(c.course_type)}`}>
                        {c.course_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{c.student_count}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{c.session_count}</td>
                    <td className="py-3 px-4 text-center font-medium text-orange-600">{c.total_hours.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">¥{c.hourly_rate}/h</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-green-600">¥{c.salary.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SalarySection({
  data,
  coaches,
  selectedCoach,
  startDate,
  endDate,
  onCoachChange,
  onStartChange,
  onEndChange,
  onExport,
}: {
  data: any;
  coaches: any[];
  selectedCoach: number;
  startDate: string;
  endDate: string;
  onCoachChange: (id: number) => void;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
  onExport: () => void;
}) {
  if (!data)
    return (
      <div className="space-y-4">
        <SalaryFiltersBar
          coaches={coaches}
          selectedCoach={selectedCoach}
          onCoachChange={onCoachChange}
          startDate={startDate}
          endDate={endDate}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
          onExport={onExport}
        />
        <div className="text-center py-12 text-[var(--text-secondary)]">暂无数据</div>
      </div>
    );

  const s = data.summary;
  return (
    <div className="space-y-6">
      <SalaryFiltersBar
        coaches={coaches}
        selectedCoach={selectedCoach}
        onCoachChange={onCoachChange}
        startDate={startDate}
        endDate={endDate}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        onExport={onExport}
      />

      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div className="text-sm text-[var(--text-secondary)] mb-1">薪资统计周期</div>
        <div className="text-lg font-bold text-[var(--text)]">
          {data.start_date} 至 {data.end_date}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatCard icon={CalendarDays} label="实际出勤" value={`${s.work_days}天`} color="teal" />
        <StatCard icon={Users} label="授课人次" value={s.student_count} color="blue" />
        <StatCard icon={BarChart3} label="授课次数" value={s.session_count} color="purple" />
        <StatCard icon={Calendar} label="带班班次" value={s.class_count} color="pink" />
        <StatCard icon={Clock} label="累计学时" value={s.total_hours.toFixed(2)} subValue="小时" color="orange" />
        <StatCard
          icon={Wallet}
          label="累计薪资"
          value={`¥${s.total_salary.toFixed(2)}`}
          color="green"
        />
      </div>

      {data.course_summary?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
          <h3 className="font-medium text-[var(--text)] mb-4">分科目薪资汇总</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课人次</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课次数</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">课时费率</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">薪资小计</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">占比</th>
                </tr>
              </thead>
              <tbody>
                {data.course_summary.map((c: any) => (
                  <tr key={c.course_type} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getCourseColor(c.course_type)}`}>
                        {c.course_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{c.student_count}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{c.session_count}</td>
                    <td className="py-3 px-4 text-center font-medium text-orange-600">{c.total_hours.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">¥{c.hourly_rate}/h</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-green-600">¥{c.salary.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">
                      {s.total_salary > 0 ? ((c.salary / s.total_salary) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <h3 className="font-medium text-[var(--text)] mb-4">每日薪资明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">日期</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">带班班次</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课人次</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">授课次数</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">当日薪资</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">科目明细</th>
              </tr>
            </thead>
            <tbody>
              {data.daily_list?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--text-secondary)]">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.daily_list.map((d: any) => (
                  <tr key={d.work_date} className="border-b border-[var(--border)]/50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--text)]">{d.work_date}</td>
                    <td className="py-3 px-4 text-center text-purple-600 font-medium">{d.class_count}</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-medium">{d.student_count}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{d.session_count}</td>
                    <td className="py-3 px-4 text-center text-orange-600 font-medium">{d.total_hours.toFixed(2)}h</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-green-600">¥{d.total_salary.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {d.course_details?.length === 0 ? (
                          <span className="text-xs text-[var(--text-secondary)]">-</span>
                        ) : (
                          d.course_details.map((c: any, i: number) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-xs ${getCourseColor(c.course_type)}`}
                              title={`${c.total_hours}h × ¥${c.hourly_rate} = ¥${c.salary}`}
                            >
                              {c.course_name} {c.total_hours}h
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.daily_list?.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-3 px-4 text-[var(--text)]">合计</td>
                  <td className="py-3 px-4 text-center text-purple-600">{s.class_count}</td>
                  <td className="py-3 px-4 text-center text-blue-600">{s.student_count}</td>
                  <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{s.session_count}</td>
                  <td className="py-3 px-4 text-center text-orange-600">{s.total_hours.toFixed(2)}h</td>
                  <td className="py-3 px-4 text-center text-green-600">¥{s.total_salary.toFixed(2)}</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function RatesSection({
  data,
  coaches,
  selectedCoach,
  onCoachChange,
  onEdit,
}: {
  data: any[];
  coaches: any[];
  selectedCoach: number;
  onCoachChange: (id: number) => void;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select
          value={selectedCoach}
          onChange={(e) => onCoachChange(Number(e.target.value))}
          className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm flex items-center gap-1"
        >
          <Settings size={14} /> 编辑课时费
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {data.map((r) => (
          <div
            key={r.course_type}
            className="bg-white rounded-xl p-5 shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2.5 py-1 rounded text-xs font-medium ${getCourseColor(r.course_type)}`}>
                {r.course_name}
              </span>
            </div>
            <div className="text-3xl font-bold text-[var(--text)] mb-1">
              ¥{Number(r.hourly_rate).toFixed(2)}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">每小时</div>
            <div className="mt-3 pt-3 border-t border-[var(--border)]/50 text-xs text-[var(--text-secondary)]">
              生效日期: {r.effective_date || '-'}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">💡 课时费说明</div>
          <ul className="text-xs space-y-1 text-blue-700">
            <li>• 科目一（理论）: 基础理论授课，费率较低</li>
            <li>• 科目二（场地）: 基础驾驶训练，含场地使用费</li>
            <li>• 科目三（道路）: 实际道路训练，含燃油及车辆损耗</li>
            <li>• 科目四（安全）: 安全文明驾驶理论授课</li>
            <li>• 薪资 = 累计学时 × 对应科目课时费率</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FiltersBar({
  coaches,
  selectedCoach,
  onCoachChange,
  date,
  onDateChange,
  dateLabel,
}: {
  coaches: any[];
  selectedCoach: number;
  onCoachChange: (id: number) => void;
  date: string;
  onDateChange: (d: string) => void;
  dateLabel: string;
}) {
  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="flex items-center gap-2">
        <User size={16} className="text-[var(--text-secondary)]" />
        <select
          value={selectedCoach}
          onChange={(e) => onCoachChange(Number(e.target.value))}
          className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-[var(--text-secondary)]" />
        <label className="text-sm text-[var(--text-secondary)]">{dateLabel}:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    </div>
  );
}

function SalaryFiltersBar({
  coaches,
  selectedCoach,
  onCoachChange,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onExport,
}: {
  coaches: any[];
  selectedCoach: number;
  onCoachChange: (id: number) => void;
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex gap-3 flex-wrap items-center justify-between">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <User size={16} className="text-[var(--text-secondary)]" />
          <select
            value={selectedCoach}
            onChange={(e) => onCoachChange(Number(e.target.value))}
            className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[var(--text-secondary)]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <span className="text-[var(--text-secondary)]">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
      <button
        onClick={onExport}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
      >
        <Download size={14} /> 导出CSV
      </button>
    </div>
  );
}

function EmptyCoachList({
  coaches,
  onSelect,
  title,
}: {
  coaches: any[];
  onSelect: (c: any) => void;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-xl border border-[var(--border)] text-center">
        <div className="text-[var(--text-secondary)] mb-4">{title}</div>
        <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          {coaches.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="p-4 border border-[var(--border)] rounded-xl hover:border-primary hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center text-white font-bold">
                  {c.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-[var(--text)]">{c.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{c.phone || '-'}</div>
                </div>
              </div>
              <div className="text-xs text-primary flex items-center justify-end">
                进入 <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
