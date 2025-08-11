
import * as React from 'react';
import { useAppState } from '../contexts/AppContext';
import { Widget } from '../components/ui/Widget';
import { GavelIcon } from '../components/icons/GavelIcon';
import type { League } from '../types';
import { useLeague } from '../hooks/useLeague';
import { ShieldAlertIcon } from '../components/icons/ShieldAlertIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { PauseIcon } from '../components/icons/PauseIcon';
import { ClipboardListIcon } from '../components/icons/ClipboardListIcon';
import { MegaphoneIcon } from '../components/icons/MegaphoneIcon';
import { AnimatePresence } from 'framer-motion';
import CreatePollModal from '../components/commissioner/CreatePollModal';
import PostAnnouncementModal from '../components/commissioner/PostAnnouncementModal';
import { ArrowRightLeftIcon } from '../components/icons/ArrowRightLeftIcon';
import ManageTradesModal from '../components/commissioner/ManageTradesModal';
import { UserPlusIcon } from '../components/icons/UserPlusIcon';
import InviteMemberModal from '../components/commissioner/InviteMemberModal';
import MemberManagementWidget from '../components/commissioner/MemberManagementWidget';
import { SettingsIcon } from '../components/icons/SettingsIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { FileTextIcon } from '../components/icons/FileTextIcon';

const CommissionerToolsContent: React.FC<{ league: League; dispatch: React.Dispatch<any> }> = ({ league, dispatch }) => {
    const { state } = useAppState();
    const [isPollModalOpen, setIsPollModalOpen] = React.useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = React.useState(false);
    const [isManageTradesModalOpen, setIsManageTradesModalOpen] = React.useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
    
    const isDrafting = league?.status === 'DRAFTING';
    const isPostDraft = league && league.status !== 'PRE_DRAFT' && league.status !== 'DRAFTING';

    const handleAdvanceWeek = () => {
        if(window.confirm(`Are you sure you want to advance to Week ${league.currentWeek + 1}? This cannot be undone.`)) {
            dispatch({ type: 'ADVANCE_WEEK', payload: { leagueId: league.id } });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { message: `Manually advancing to Week ${league.currentWeek + 1}...`, type: 'SYSTEM' } });
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
            <header className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider uppercase text-[var(--text-primary)]">
                        Commissioner Tools
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] tracking-widest">{league.name}</p>
                </div>
                <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'LEAGUE_HUB' })} className="w-full sm:w-auto px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 mobile-touch-target">
                    Back to League Hub
                </button>
            </header>
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
                <div className="space-y-4 sm:space-y-6">
                    <Widget title="League Communication">
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                            <button onClick={() => setIsPollModalOpen(true)} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><ClipboardListIcon /> Create Weekly Poll</h3>
                                <p className="text-xs text-gray-400 mt-1">Engage your league with a fun weekly poll.</p>
                            </button>
                            <button onClick={() => setIsAnnouncementModalOpen(true)} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><MegaphoneIcon /> Post Announcement</h3>
                                <p className="text-xs text-gray-400 mt-1">Post an important message to the league hub.</p>
                            </button>
                        </div>
                    </Widget>
                     <Widget title="League Settings">
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                            <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'EDIT_LEAGUE_SETTINGS' })} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><SettingsIcon /> Edit League Settings</h3>
                                <p className="text-xs text-gray-400 mt-1">Update league name, deadlines, and branding.</p>
                            </button>
                             <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'CUSTOM_SCORING_EDITOR' })} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><PencilIcon /> Edit Scoring Rules</h3>
                                <p className="text-xs text-gray-400 mt-1">Customize your league's scoring system.</p>
                            </button>
                            <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'SCHEDULE_MANAGEMENT' })} disabled={!isPostDraft} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><CalendarIcon /> Edit Schedule</h3>
                                <p className="text-xs text-gray-400 mt-1">View and manually adjust weekly matchups.</p>
                            </button>
                             <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'LEAGUE_CONSTITUTION' })} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><FileTextIcon /> Generate Constitution</h3>
                                <p className="text-xs text-gray-400 mt-1">Create a formal league constitution document.</p>
                            </button>
                        </div>
                    </Widget>
                    <MemberManagementWidget league={league} dispatch={dispatch} />
                </div>
                <div className="space-y-4 sm:space-y-6">
                     <Widget title="In-Season Management">
                         <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                             <button onClick={() => setIsManageTradesModalOpen(true)} disabled={!isPostDraft} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><ArrowRightLeftIcon /> Manage Trades</h3>
                                <p className="text-xs text-gray-400 mt-1">Review, force, or veto pending trades in the league.</p>
                            </button>
                             <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'EDIT_ROSTER' })} disabled={!isPostDraft} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><PencilIcon /> Edit Rosters</h3>
                                <p className="text-xs text-gray-400 mt-1">Manually add or remove players from any team's roster.</p>
                            </button>
                             <button onClick={() => dispatch({ type: 'PAUSE_DRAFT', payload: !state.isDraftPaused })} disabled={!isDrafting} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><PauseIcon /> {state.isDraftPaused ? 'Resume Draft' : 'Pause Draft'}</h3>
                                <p className="text-xs text-gray-400 mt-1">Temporarily pause or unpause a live draft.</p>
                            </button>
                            <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'FINANCE_TRACKER' })} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><PencilIcon /> Financials</h3>
                                <p className="text-xs text-gray-400 mt-1">Track league dues and payouts.</p>
                            </button>
                         </div>
                    </Widget>
                    <Widget title="Membership">
                        <div className="p-3 sm:p-4">
                             <button onClick={() => setIsInviteModalOpen(true)} className="w-full p-3 bg-white/5 rounded-lg text-left hover:bg-white/10 mobile-touch-target">
                                <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base"><UserPlusIcon /> Invite Members</h3>
                                <p className="text-xs text-gray-400 mt-1">Add new managers to your league.</p>
                            </button>
                        </div>
                    </Widget>
                     <Widget title="Danger Zone">
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                             <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                <h3 className="font-semibold text-red-300 text-sm sm:text-base">Advance Week</h3>
                                <p className="text-xs text-gray-400 mt-1 mb-2">Manually process the results of the current week and advance the league to the next week. Use with caution.</p>
                                <button onClick={handleAdvanceWeek} className="w-full sm:w-auto px-4 py-2 bg-red-500/80 text-white font-bold text-sm rounded-lg hover:bg-red-500 mobile-touch-target">
                                    Force Advance to Week {league.currentWeek + 1}
                                </button>
                            </div>
                             <div className="p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg">
                                <h3 className="font-semibold text-white flex items-center gap-2"><ShieldAlertIcon /> Project Integrity</h3>
                                <p className="text-xs text-gray-400 mt-1 mb-2">Run a diagnostic scan on the application codebase to check for potential issues.</p>
                                <button
                                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'PROJECT_INTEGRITY' })}
                                    className="px-4 py-2 bg-gray-600/80 text-white font-bold text-sm rounded-lg hover:bg-gray-500"
                                >
                                    Run Integrity Scan
                                </button>
                            </div>
                        </div>
                    </Widget>
                </div>
            </main>
            <AnimatePresence>
                {isPollModalOpen && (
                    <CreatePollModal leagueId={league.id} onClose={() => setIsPollModalOpen(false)} />
                )}
                {isAnnouncementModalOpen && (
                    <PostAnnouncementModal leagueId={league.id} onClose={() => setIsAnnouncementModalOpen(false)} />
                )}
                {isManageTradesModalOpen && (
                    <ManageTradesModal league={league} onClose={() => setIsManageTradesModalOpen(false)} />
                )}
                {isInviteModalOpen && (
                    <InviteMemberModal league={league} onClose={() => setIsInviteModalOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

const CommissionerToolsView: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { league } = useLeague();
    
    if (!league || state.user.id !== league.commissionerId) {
        return (
            <div className="p-8 text-center w-full h-full flex flex-col items-center justify-center">
                <p className="text-red-400">Access Denied. You are not the commissioner of this league.</p>
                 <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'DASHBOARD' })} className="mt-4 px-4 py-2 bg-cyan-500 rounded">
                    Back to Dashboard
                </button>
            </div>
        );
    }
    
    return <CommissionerToolsContent league={league} dispatch={dispatch} />;
};

export default CommissionerToolsView;
