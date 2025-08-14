
import * as React from 'react';
import AstralDraftApp from './components/AstralDraftApp';
import './styles/mobile-touch-targets.css';
import './styles/mobile-form-optimization.css';
import './styles/mobile-focus-management.css';
import './styles/mobile-responsive.css';
import './styles/mobile-advanced.css';

const App: React.FC = () => {
    return <AstralDraftApp />;
};

export default App;
const LeagueHistoryView = LazyComponents.Chart(() => import('./views/LeagueHistoryView'));
import { AnimatePresence, motion } from 'framer-motion';
import NotificationManager from './components/ui/NotificationManager';
import SeasonReviewView from './views/SeasonReviewView';
import StartSitToolView from './views/StartSitToolView';
import AssistantView from './views/AssistantView';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import { InstallPrompt, PWAStatusBanner } from './components/ui/InstallPrompt';
import ProfileView from './views/ProfileView';
import LeagueRulesView from './views/LeagueRulesView';
import CommissionerToolsView from './views/CommissionerToolsView';
import ManagerView from './views/ManagerView';
import VoiceCommandButton from './components/core/VoiceCommandButton';
import EditRosterView from './views/EditRosterView';
import DraftPrepCenterView from './views/DraftPrepCenterView';
import SeasonStoryView from './views/SeasonStoryView';
import PlayerDetailModal from './components/player/PlayerDetailModal';
import { View } from './types';
import TeamComparisonView from './views/TeamComparisonView';
import MobileNavMenu from './components/core/MobileNavMenu';
import MobileNavigation from './components/layout/MobileNavigation';
import MainLayout from './components/layout/MainLayout';
import EditLeagueSettingsView from './views/EditLeagueSettingsView';
import SeasonArchiveView from './views/SeasonArchiveView';
import LeagueStatsView from './views/LeagueStatsView';
import { initializeGlobalFormEnhancement } from './utils/mobileFormEnhancement';
import ScheduleManagementView from './views/ScheduleManagementView';
import MessagesView from './views/MessagesView';
import ChampionshipOddsView from './views/ChampionshipOddsView';
import ProjectedStandingsView from './views/ProjectedStandingsView';
import TrophyRoomView from './views/TrophyRoomView';
import FinanceTrackerView from './views/FinanceTrackerView';
import CustomScoringEditorView from './views/CustomScoringEditorView';
import { WeeklyRecapVideoView } from './views/WeeklyRecapVideoView';
import LeagueConstitutionView from './views/LeagueConstitutionView';
import GamedayHostView from './views/GamedayHostView';
import LeagueNewspaperView from './views/LeagueNewspaperView';
import KeeperSelectionView from './views/KeeperSelectionView';
import AuthView from './views/AuthView';
import OpenLeaguesView from './views/OpenLeaguesView';
import LeaderboardView from './views/LeaderboardView';
import LiveDraftRoomView from './views/LiveDraftRoomView';
import SeasonContestView from './views/SeasonContestView';

const viewVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '5%' : '-5%',
    opacity: 0,
    scale: 0.98,
  }),
  animate: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '5%' : '-5%',
    opacity: 0,
    scale: 0.98,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 30,
    },
  }),
};

const SplashScreen: React.FC = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
            <img src="/favicon.svg" alt="Astral Draft Logo" className="h-24 w-24 mx-auto mb-4" />
        </motion.div>
         <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-display text-4xl font-bold tracking-wider text-white"
        >
            ASTRAL DRAFT
        </motion.h1>
    </div>
);


const AppContent: React.FC = () => {
    const { state, dispatch } = useAppState();
    const [direction, setDirection] = React.useState(1);
    const viewRef = React.useRef(state.currentView);
    
    // Initialize mobile viewport management
    useMobileViewport();
    
    const activeLeague = state.leagues.find(l => l.id === state.activeLeagueId);
    
    React.useEffect(() => {
        const timer = setTimeout(() => dispatch({ type: 'SET_LOADING', payload: false }), 1500);
        return () => clearTimeout(timer);
    }, [dispatch]);

    // Initialize mobile form enhancement
    React.useEffect(() => {
        const cleanup = initializeGlobalFormEnhancement({
            enableAutocomplete: true,
            enableInputMode: true,
            enableMobileKeyboards: true
        });
        return cleanup;
    }, []);

    if(state.isLoading) {
        return <SplashScreen />;
    }

    // Auth gate
    if (state.user.id === 'guest') {
        return <AuthView />;
    }

    React.useEffect(() => {
        const history: View[] = ['DASHBOARD', 'LEAGUE_HUB', 'TEAM_HUB'];
        const oldIndex = history.indexOf(viewRef.current);
        const newIndex = history.indexOf(state.currentView);

        if (oldIndex !== -1 && newIndex !== -1) {
            setDirection(newIndex > oldIndex ? 1 : -1);
        } else {
            setDirection(1);
        }
        
        viewRef.current = state.currentView;
        document.documentElement.dataset.view = state.currentView;
    }, [state.currentView]);

    React.useEffect(() => {
        const myTeam = activeLeague?.teams.find(t => t.owner.id === state.user.id);
        let isRivalryWeek = false;

        if (activeLeague && myTeam && activeLeague.topRivalry) {
            const currentMatchup = activeLeague.schedule.find(
                m => m.week === activeLeague.currentWeek && (m.teamA.teamId === myTeam.id || m.teamB.teamId === myTeam.id)
            );

            if (currentMatchup) {
                const opponentId = currentMatchup.teamA.teamId === myTeam.id ? currentMatchup.teamB.teamId : currentMatchup.teamA.teamId;
                if (opponentId === activeLeague.topRivalry.teamAId || opponentId === activeLeague.topRivalry.teamBId) {
                    isRivalryWeek = true;
                }
            }
        }

        if (isRivalryWeek) {
            document.documentElement.dataset.theme = 'rivalry';
        } else {
            delete document.documentElement.dataset.theme;
        }

        return () => {
            delete document.documentElement.dataset.theme;
        };
    }, [activeLeague, state.user.id]);

    const renderView = () => {
        switch (state.currentView) {
            case 'DASHBOARD': return <DashboardView />;
            case 'LEAGUE_HUB': return <LeagueHubView />;
            case 'DRAFT_ROOM': return <DraftRoomView />;
            case 'TEAM_HUB': return <TeamHubView />;
            case 'ANALYTICS_HUB': return <AnalyticsHubView />;
            case 'HISTORICAL_ANALYTICS': return <HistoricalAnalyticsOverview />;
            case 'LEAGUE_STANDINGS': return <LeagueStandingsView />;
            case 'WAIVER_WIRE': return <WaiverWireView />;
            case 'MATCHUP': return <MatchupView />;
            case 'POWER_RANKINGS': return <PowerRankingsView />;
            case 'PLAYOFF_BRACKET': return <PlayoffBracketView />;
            case 'WEEKLY_REPORT': return <WeeklyReportView />;
            case 'LEAGUE_HISTORY': return <LeagueHistoryView />;
            case 'SEASON_REVIEW': return <SeasonReviewView />;
            case 'SEASON_ARCHIVE': return <SeasonArchiveView />;
            case 'START_SIT_TOOL': return <StartSitToolView />;
            case 'ASSISTANT': return <AssistantView />;
            case 'PROFILE': return <ProfileView />;
            case 'MANAGER_PROFILE': return <ManagerView />;
            case 'LEAGUE_RULES': return <LeagueRulesView />;
            case 'COMMISSIONER_TOOLS': return <CommissionerToolsView />;
            case 'DRAFT_STORY': return <DraftStoryView />;
            case 'EDIT_ROSTER': return <EditRosterView />;
            case 'DRAFT_PREP_CENTER': return <DraftPrepCenterView />;
            case 'PERFORMANCE_TRENDS': return <PerformanceTrendsView />;
            case 'SEASON_STORY': return <SeasonStoryView />;
            case 'TEAM_COMPARISON': return <TeamComparisonView />;
            case 'EDIT_LEAGUE_SETTINGS': return <EditLeagueSettingsView />;
            case 'LEAGUE_STATS': return <LeagueStatsView />;
            case 'SCHEDULE_MANAGEMENT': return <ScheduleManagementView />;
            case 'MESSAGES': return <MessagesView />;
            case 'CHAMPIONSHIP_ODDS': return <ChampionshipOddsView />;
            case 'PROJECTED_STANDINGS': return <ProjectedStandingsView />;
            case 'TROPHY_ROOM': return <TrophyRoomView />;
            case 'BEAT_THE_ORACLE': return <BeatTheOracleView />;
            case 'FINANCE_TRACKER': return <FinanceTrackerView />;
            case 'CUSTOM_SCORING_EDITOR': return <CustomScoringEditorView />;
            case 'WEEKLY_RECAP_VIDEO': return <WeeklyRecapVideoView />;
            case 'LEAGUE_CONSTITUTION': return <LeagueConstitutionView />;
            case 'GAMEDAY_HOST': return <GamedayHostView />;
            case 'LEAGUE_NEWSPAPER': return <LeagueNewspaperView />;
            case 'KEEPER_SELECTION': return <KeeperSelectionView />;
            case 'OPEN_LEAGUES': return <OpenLeaguesView />;
            case 'LEADERBOARD': return <LeaderboardView />;
            case 'LIVE_DRAFT_ROOM': return <LiveDraftRoomView />;
            case 'SEASON_CONTESTS': return <SeasonContestView />;
            default: return <DashboardView />;
        }
    }
    
    return (
        <div className="relative w-full h-full flex flex-col font-sans bg-transparent">
            <MainLayout>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={state.currentView}
                        className="w-full h-full"
                        {...{
                          custom: direction,
                          variants: viewVariants,
                          initial: "initial",
                          animate: "animate",
                          exit: "exit",
                        }}
                    >
                        {renderView()}
                    </motion.div>
                </AnimatePresence>
            </MainLayout>
            <CommandPalette />
            <NotificationManager />
            <VoiceCommandButton />
            <InstallPrompt />
            <PWAStatusBanner />
             <AnimatePresence>
                {state.activePlayerDetail && (
                    <PlayerDetailModal
                        player={state.activePlayerDetail}
                        onClose={() => dispatch({ type: 'SET_PLAYER_DETAIL', payload: { player: null } })}
                        playerNotes={state.playerNotes}
                        dispatch={dispatch}
                        league={activeLeague}
                        initialTab={state.activePlayerDetailInitialTab}
                        playerAvatars={state.playerAvatars}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {state.isMobileNavOpen && <MobileNavMenu />}
            </AnimatePresence>
        </div>
    );
}


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthInitializer fallback={<div className="loading-screen">Initializing authentication...</div>}>
        <AppProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AppProvider>
      </AuthInitializer>
    </AuthProvider>
  );
};

export default App;
