import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { MessageSquare, Star, ThumbsUp, Users, Search, Filter, Eye, ChevronRight } from 'lucide-react';
import Modal from '@/components/Modal';

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [coachFilter, setCoachFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showCoachSummary, setShowCoachSummary] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadCoaches();
  }, [page, coachFilter, courseFilter]);

  const loadData = async () => {
    const params = new URLSearchParams({ page: String(page), limit: 20 });
    if (coachFilter) params.append('coach_id', coachFilter);
    if (courseFilter) params.append('course_type', courseFilter);
    const res: any = await api.get(`/evaluations?${params.toString()}`);
    if (res.success) {
      setEvaluations(res.data.list.filter((e: any) =>
        !search || e.coach_name?.includes(search) || e.student_name?.includes(search)
      ));
      setTotal(res.data.total);
    }
  };

  const loadCoaches = async () => {
    const res: any = await api.get('/coaches');
    if (res.success) setCoaches(res.data);
  };

  const loadDetail = async (id: number) => {
    const res: any = await api.get(`/evaluations/${id}`);
    if (res.success) setShowDetail(res.data);
  };

  const loadCoachSummary = async (coachId: number) => {
    const res: any = await api.get(`/evaluations/coach/${coachId}/summary`);
    if (res.success) {
      const coach = coaches.find((c) => c.id === coachId);
      setShowCoachSummary({ ...res.data, coach_name: coach?.name });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const res: any = await api.put(`/evaluations/${id}/status`, { status });
    if (res.success) {
      alert('状态更新成功');
      loadData();
      if (showDetail?.id === id) setShowDetail(res.data);
    }
  };

  const getCourseName = (c: string) => ({ subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' }[c] || c);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <MessageSquare className="text-purple-500" /> 教学质量评估
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">多维度教学评价体系，提升教学服务质量</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="评价总数" value={total} color="purple" />
        <StatCard icon={Star} label="平均评分" value={evaluations.length > 0 ? (evaluations.reduce((s, e) => s + (e.overall_score || 0), 0) / Math.max(1, evaluations.length)).toFixed(2) : '0.00'} color="yellow" />
        <StatCard icon={Users} label="参评教练" value={new Set(evaluations.map((e) => e.coach_id)).size} color="blue" />
        <StatCard icon={ThumbsUp} label="好评率(≥4分)" value={evaluations.length > 0 ? `${((evaluations.filter((e) => e.overall_score >= 4).length / Math.max(1, evaluations.length)) * 100).toFixed(0)}%` : '0%'} color="green" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {coaches.slice(0, 3).map((coach) => (
          <CoachCard key={coach.id} coach={coach} onClick={() => loadCoachSummary(coach.id)} />
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索教练或学员姓名..." className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <select value={coachFilter} onChange={(e) => { setCoachFilter(e.target.value); setPage(1); }} className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">全部教练</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">全部科目</option>
            <option value="subject1">科目一</option>
            <option value="subject2">科目二</option>
            <option value="subject3">科目三</option>
            <option value="subject4">科目四</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">教练</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">学员</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">专业度</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">耐心度</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">沟通</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">守时</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">综合分</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">评价内容</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">标签</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">时间</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-[var(--text-secondary)]">暂无评价数据</td></tr>
              ) : evaluations.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)]/50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <button onClick={() => loadCoachSummary(e.coach_id)} className="font-medium text-[var(--text)] hover:text-primary hover:underline">
                      {e.coach_name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{e.is_anonymous ? '匿名学员' : e.student_name}</td>
                  <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{getCourseName(e.course_type)}</td>
                  <td className="py-3 px-4 text-center"><ScoreStars score={e.professional_score} /></td>
                  <td className="py-3 px-4 text-center"><ScoreStars score={e.patience_score} /></td>
                  <td className="py-3 px-4 text-center"><ScoreStars score={e.communication_score} /></td>
                  <td className="py-3 px-4 text-center"><ScoreStars score={e.punctuality_score} /></td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold ${e.overall_score >= 4.5 ? 'text-green-600' : e.overall_score >= 3.5 ? 'text-blue-600' : e.overall_score >= 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {e.overall_score?.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-[180px]">
                    <p className="text-[var(--text-secondary)] text-xs truncate">{e.comment || '-'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {e.tags ? e.tags.split(',').slice(0, 2).map((t: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{t}</span>
                      )) : '-'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-[var(--text-secondary)] text-xs">{e.created_at?.substring(5, 16)}</td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => loadDetail(e.id)} className="text-primary hover:underline text-xs flex items-center gap-1 justify-center">
                      <Eye size={12} /> 查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50">上一页</button>
            <span className="text-sm text-[var(--text-secondary)]">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
            <button onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">下一页</button>
          </div>
        )}
      </div>

      {showDetail && (
        <Modal title="评价详情" onClose={() => setShowDetail(null)} width="max-w-xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
              <div><div className="text-xs text-[var(--text-secondary)]">教练</div><div className="font-medium text-[var(--text)]">{showDetail.coach_name}</div></div>
              <div><div className="text-xs text-[var(--text-secondary)]">学员</div><div className="font-medium text-[var(--text)]">{showDetail.is_anonymous ? '匿名' : showDetail.student_name}</div></div>
              <div><div className="text-xs text-[var(--text-secondary)]">科目</div><div className="font-medium text-[var(--text)]">{getCourseName(showDetail.course_type)}</div></div>
              <div><div className="text-xs text-[var(--text-secondary)]">评价时间</div><div className="font-medium text-[var(--text)] text-sm">{showDetail.created_at}</div></div>
            </div>
            <div className="space-y-2">
              {[['专业度', showDetail.professional_score], ['耐心度', showDetail.patience_score], ['沟通能力', showDetail.communication_score], ['守时情况', showDetail.punctuality_score]].map(([label, score]) => (
                <div key={label as string} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                  <ScoreStars score={score as number} showText />
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-purple-50 rounded-lg border border-primary/10">
                <span className="font-medium text-[var(--text)]">综合评分</span>
                <span className="text-2xl font-bold text-primary">{showDetail.overall_score?.toFixed(1)}</span>
              </div>
            </div>
            {showDetail.comment && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="text-xs font-medium text-yellow-800 mb-1">评价内容</div>
                <p className="text-sm text-yellow-700">{showDetail.comment}</p>
              </div>
            )}
            {showDetail.tags && (
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">标签</div>
                <div className="flex flex-wrap gap-2">
                  {showDetail.tags.split(',').map((t: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              {showDetail.status === 'published' ? (
                <button onClick={() => handleStatusChange(showDetail.id, 'hidden')} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">隐藏评价</button>
              ) : showDetail.status === 'hidden' ? (
                <button onClick={() => handleStatusChange(showDetail.id, 'published')} className="px-4 py-2 text-green-600 border border-green-200 rounded-lg hover:bg-green-50">恢复公开</button>
              ) : null}
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50">关闭</button>
            </div>
          </div>
        </Modal>
      )}

      {showCoachSummary && (
        <Modal title={`${showCoachSummary.coach_name} - 评价汇总`} onClose={() => setShowCoachSummary(null)} width="max-w-3xl">
          <div className="space-y-5">
            <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {showCoachSummary.coach_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--text)] mb-1">{showCoachSummary.coach_name}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary">{showCoachSummary.overall.avg_overall}</span>
                    <div className="text-yellow-500 text-lg">{'★★★★★'}</div>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">共 {showCoachSummary.overall.total_count} 条评价</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <DimScore label="专业度" score={showCoachSummary.overall.avg_professional} />
              <DimScore label="耐心度" score={showCoachSummary.overall.avg_patience} />
              <DimScore label="沟通能力" score={showCoachSummary.overall.avg_communication} />
              <DimScore label="守时情况" score={showCoachSummary.overall.avg_punctuality} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[var(--border)] rounded-xl">
                <h4 className="font-medium text-[var(--text)] mb-3">评分分布</h4>
                {['5星', '4星', '3星', '2星', '1星'].map((star, idx) => {
                  const item = showCoachSummary.score_distribution.find((s: any) => s.star === star);
                  const count = item?.count || 0;
                  const pct = showCoachSummary.overall.total_count > 0 ? (count / showCoachSummary.overall.total_count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 mb-2">
                      <span className="text-xs w-8 text-[var(--text-secondary)]">{star}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-green-400' : idx === 2 ? 'bg-blue-400' : idx === 3 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-white border border-[var(--border)] rounded-xl">
                <h4 className="font-medium text-[var(--text)] mb-3">热门标签</h4>
                <div className="flex flex-wrap gap-2">
                  {showCoachSummary.popular_tags.length === 0 ? (
                    <span className="text-sm text-[var(--text-secondary)]">暂无标签</span>
                  ) : showCoachSummary.popular_tags.map((t: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                      {t.tag} <span className="text-purple-400">×{t.count}</span>
                    </span>
                  ))}
                </div>
                <h4 className="font-medium text-[var(--text)] mt-4 mb-2">各科目评价</h4>
                <div className="space-y-1.5">
                  {showCoachSummary.by_course.length === 0 ? (
                    <span className="text-xs text-[var(--text-secondary)]">暂无数据</span>
                  ) : showCoachSummary.by_course.map((c: any) => (
                    <div key={c.course_type} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{getCourseName(c.course_type)}</span>
                      <span className="font-medium text-[var(--text)]">{c.avg_score?.toFixed(1)} ({c.count}条)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {showCoachSummary.recent_comments?.length > 0 && (
              <div className="p-4 bg-white border border-[var(--border)] rounded-xl">
                <h4 className="font-medium text-[var(--text)] mb-3">最新学员留言</h4>
                <div className="space-y-3">
                  {showCoachSummary.recent_comments.map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--text)]">{c.student_name}</span>
                        <span className="text-yellow-500 text-xs">{'★'.repeat(Math.round(c.overall_score))}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = { purple: 'from-purple-500 to-purple-600', yellow: 'from-yellow-500 to-orange-500', blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600' };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}

function ScoreStars({ score, showText = false }: { score: number; showText?: boolean }) {
  const full = Math.round(score);
  return (
    <div className="flex items-center gap-1 justify-center">
      <span className="text-yellow-500">
        {'★'.repeat(full)}<span className="text-gray-200">{'★'.repeat(5 - full)}</span>
      </span>
      {showText && <span className="text-sm font-medium text-[var(--text)] ml-1">{score?.toFixed(1)}</span>}
    </div>
  );
}

function DimScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="p-3 bg-gradient-to-br from-gray-50 to-white border border-[var(--border)] rounded-xl text-center">
      <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
      <div className="text-xl font-bold text-[var(--text)]">{score?.toFixed(1)}</div>
      <div className="text-yellow-400 text-xs mt-0.5">{'★'.repeat(Math.round(score))}</div>
    </div>
  );
}

function CoachCard({ coach, onClick }: { coach: any; onClick: () => void }) {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    const load = async () => {
      const res: any = await api.get(`/evaluations/coach/${coach.id}/summary`);
      if (res.success) setSummary(res.data);
    };
    load();
  }, [coach.id]);
  return (
    <button onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)] hover:shadow-md hover:border-primary/30 transition-all text-left group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">{coach.name?.charAt(0)}</div>
        <div className="flex-1">
          <div className="font-medium text-[var(--text)] flex items-center gap-1">
            {coach.name}
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] transition-opacity" />
          </div>
          <div className="text-xs text-[var(--text-secondary)]">{coach.phone}</div>
        </div>
      </div>
      {summary ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-primary">{summary.overall.avg_overall}</span>
            <div className="text-yellow-400">{'★★★★★'}</div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">{summary.overall.total_count} 条评价 · 好评率 {summary.overall.total_count > 0 ? `${((summary.score_distribution.find((s: any) => s.star === '5星')?.count || 0 + summary.score_distribution.find((s: any) => s.star === '4星')?.count || 0) / summary.overall.total_count * 100).toFixed(0)}%` : '0%'}</div>
        </div>
      ) : <div className="text-xs text-[var(--text-secondary)]">加载中...</div>}
    </button>
  );
}
