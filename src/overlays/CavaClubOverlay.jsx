import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  ChevronsUp,
  ChevronsDown,
  AlertCircle,
  Flag,
  User,
  Trophy,
  ArrowRightLeft,
} from "lucide-react";
import { useVolleyballData } from "../context/VolleyballContext";

export default function CavaClubOverlay({ matchId }) {
  const { matches: contextMatches, teams } = useVolleyballData();
  const [remoteMatch, setRemoteMatch] = useState(null);
  const [viewState, setViewState] = useState("hidden");

  // --- 1. SMART SERVER DETECTION ---
  let serverUrl = "http://localhost:3001";
  try {
    const params = new URLSearchParams(window.location.search);
    serverUrl =
      params.get("server") ||
      window.localStorage.getItem("volleyball_server_url") ||
      "http://localhost:3001";
  } catch (e) {}

  useEffect(() => {
    if (serverUrl && matchId) {
      const fetchData = async () => {
        try {
          const res = await fetch(`${serverUrl}/matches`);
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((m) => m.id === matchId);
            if (found) setRemoteMatch(found);
          }
        } catch (e) {}
      };
      fetchData();
      const interval = setInterval(fetchData, 1000);
      return () => clearInterval(interval);
    }
  }, [serverUrl, matchId]);

  const activeMatchData =
    (Array.isArray(contextMatches) &&
      contextMatches.find((m) => m.id === matchId)) ||
    remoteMatch;

  // --- 2. ROBUST URL RESOLVER ---
  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;

    let path = url;
    if (url.startsWith("http")) {
      try {
        const u = new URL(url);
        if (
          u.port === "3001" ||
          u.pathname.includes("/uploads/") ||
          u.pathname.includes("/img/")
        ) {
          path = u.pathname + u.search;
        } else {
          return url;
        }
      } catch (e) {}
    }
    const cleanServer = serverUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanServer}${cleanPath}`;
  };

  const getTeam = (mTeam) => {
    if (!mTeam) return {};
    const real = (teams || []).find((t) => t.id === mTeam.id);
    return real ? { ...mTeam, ...real } : mTeam;
  };

  useEffect(() => {
    const validViews = [
      "scoreboard",
      "full_time",
      "substitution",
      "referee1",
      "referee2",
      "match_result",
      "standings",
      "standings_A",
      "standings_B",
      "lineup_A",
      "lineup_B",
    ];
    const isActiveView = validViews.includes(activeMatchData?.activeView);

    if (isActiveView && activeMatchData?.graphicsVisible) {
      if (viewState === "hidden") {
        setViewState("intro");
        const timer = setTimeout(() => setViewState("active"), 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setViewState("hidden");
    }
  }, [activeMatchData?.activeView, activeMatchData?.graphicsVisible]);

  if (!activeMatchData)
    return (
      <div className="text-white bg-black/50 p-10 font-mono">
        Waiting for Data... ID: {matchId}
      </div>
    );

  const match = activeMatchData;
  const left = match.isSwapped ? getTeam(match.teamB) : getTeam(match.teamA);
  const right = match.isSwapped ? getTeam(match.teamA) : getTeam(match.teamB);
  const show = match.graphicsVisible;

  return (
    <div className="w-[1920px] h-[1080px] relative overflow-hidden font-sans pointer-events-none select-none text-white">
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700;900&display=swap');
                .font-vnl { font-family: 'Oswald', sans-serif; }
                
                /* ANIMATIONS */
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .animate-slide-in-left { animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

                .animate-slide-in-right { animation: slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                
                .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes popIn { from { transform: scale(0.5) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

                .animate-row-slide { animation: rowSlide 0.5s ease-out forwards; opacity: 0; transform: translateX(-20px); }
                @keyframes rowSlide { to { opacity: 1; transform: translateX(0); } }

                .animate-stomp { animation: stomp 0.5s cubic-bezier(0.5, 1.5, 0.5, 1) forwards; opacity: 0; transform: scale(3); }
                @keyframes stomp { 0% { opacity: 0; transform: scale(3) translateY(-50px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

                .animate-expand-width { animation: expandWidth 0.5s ease-out forwards 0.3s; width: 0; overflow: hidden; }
                @keyframes expandWidth { from { width: 0; } to { width: 100%; } }

                .vnl-text-base { font-weight: 900; color: white; display: inline-block; white-space: nowrap; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
                .perspective-container { perspective: 300px; transform-style: preserve-3d; }
                .vnl-warp-left { transform-origin: right center; transform: rotateY(-25deg) scale(1.3) translateX(-10px); }
                .vnl-warp-right { transform-origin: left center; transform: rotateY(25deg) scale(1.3) translateX(10px); }

                .animate-arrows-up { animation: slide-up 0.6s linear infinite; }
                .animate-arrows-down { animation: slide-down 0.6s linear infinite; }
                @keyframes slide-up { 0% { transform: translateY(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-20px); opacity: 0; } }
                @keyframes slide-down { 0% { transform: translateY(-20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }
            `}</style>

      {/* 1. SCOREBOARD */}
      {show &&
        (match.activeView === "scoreboard" ||
          match.activeView === "full_time" ||
          match.activeView === "substitution") && (
          <ScoreboardSection
            match={match}
            left={left}
            right={right}
            viewState={viewState}
            resolveUrl={resolveUrl}
          />
        )}

      {/* 2. REFEREES */}
      {show &&
        (match.activeView === "referee1" ||
          match.activeView === "referee2") && (
          <SingleRefereeSection match={match} activeRef={match.activeView} />
        )}

      {/* 3. MATCH RESULT */}
      {show && match.activeView === "match_result" && (
        <MatchResultSection
          match={match}
          left={left}
          right={right}
          resolveUrl={resolveUrl}
        />
      )}

      {/* 4. LIVE STANDINGS */}
      {show &&
        (match.activeView === "standings" ||
          match.activeView === "standings_A" ||
          match.activeView === "standings_B") && (
          <StandingsSection
            matches={contextMatches || []}
            teams={teams || []}
            resolveUrl={resolveUrl}
            viewMode={match.activeView}
          />
        )}

      {/* 5. LINEUP */}
      {show &&
        (match.activeView === "lineup_A" ||
          match.activeView === "lineup_B") && (
          <LineupSection
            team={
              match.activeView === "lineup_A"
                ? getTeam(match.teamA)
                : getTeam(match.teamB)
            }
            ids={
              match.activeView === "lineup_A" ? match.lineupA : match.lineupB
            }
            step={match.lineupStep || 0}
            resolveUrl={resolveUrl}
          />
        )}
    </div>
  );
}

// ==========================================
// SCOREBOARD (REVERTED: Top Border Removed)
// ==========================================
function ScoreboardSection({ match, left, right, viewState, resolveUrl }) {
  const isFullTime = match.activeView === "full_time";
  const sL =
    !isFullTime &&
    match.serveVisible &&
    match.serving === (match.isSwapped ? "B" : "A");
  const sR =
    !isFullTime &&
    match.serveVisible &&
    match.serving === (match.isSwapped ? "A" : "B");
  const baseWidth = viewState === "intro" ? "w-[450px]" : "w-[280px]";
  const isIntro = viewState === "intro";

  return (
    <div
      className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end font-vnl transition-all duration-700 translate-y-0 opacity-100`}
    >
      {/* LEFT TEAM */}
      <div className="flex flex-col items-start relative z-20">
        {!isFullTime && !isIntro && (
          <div className="w-full flex justify-end mb-1 relative z-50">
            <StatusArea
              match={match}
              team={left}
              isLeft={true}
              resolveUrl={resolveUrl}
            />
          </div>
        )}

        <div className="flex items-center h-20 shadow-2xl relative z-20">
          <div
            className="w-24 h-full flex items-center justify-center z-30 relative p-1 pl-8"
            style={{ backgroundColor: left.color || "#333" }}
          >
            {left.flag ? (
              <img
                src={resolveUrl(left.flag)}
                className="w-full h-full object-contain drop-shadow-md"
              />
            ) : (
              <Shield className="text-white/50" />
            )}
          </div>

          {/* Name Bar - REVERTED to no top border */}
          <div
            className={`h-full flex items-center overflow-hidden relative transition-all duration-1000 ${baseWidth}`}
            style={{
              background: `linear-gradient(90deg, ${left.color} 30%, #0f172a 100%)`,
            }}
          >
            <div className="flex items-center w-full h-full relative z-10 px-4">
              {sL && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                  <img
                    src="/img/volleyball.png"
                    className="w-5 animate-spin-slow drop-shadow-md"
                  />
                </div>
              )}
              <div
                className={`flex flex-col justify-center w-full h-full ${
                  sL ? "pl-6" : ""
                } perspective-container`}
              >
                <span
                  className={`uppercase tracking-tight leading-none whitespace-nowrap truncate 
                                    ${
                                      isIntro
                                        ? "text-5xl font-black"
                                        : "text-6xl font-black"
                                    } 
                                    ${
                                      sL && !isIntro
                                        ? "vnl-text-base vnl-warp-left"
                                        : "drop-shadow-md"
                                    }
                                `}
                >
                  {isIntro
                    ? left.name
                    : left.shortName ||
                      left.country ||
                      left.name.substring(0, 3)}
                </span>
              </div>
            </div>
          </div>

          {/* SETS */}
          <div
            className={`h-full flex bg-slate-800 border-x border-white/10 transition-all duration-700 overflow-hidden items-center justify-center relative z-20
                        ${
                          isFullTime
                            ? "w-24 bg-slate-900"
                            : isIntro
                            ? "w-0 opacity-0"
                            : "w-16 opacity-100"
                        }`}
          >
            <span className="absolute top-1 text-[16px] text-slate-400 tracking-widest font-bold">
              SETS
            </span>
            <span
              className={`font-black leading-none text-white mt-4 transition-all duration-700 ${
                isFullTime ? "text-5xl scale-110" : "text-3xl"
              }`}
            >
              {left.sets}
            </span>
            {!isFullTime && (
              <span className="absolute top-1 text-[16px] text-slate-400 tracking-widest font-bold">
                SETS
              </span>
            )}
          </div>

          {/* SCORE */}
          <div
            className={`h-full flex items-center justify-center bg-[#f05c22] text-white transition-all duration-700 ease-in-out overflow-hidden
                        ${
                          isFullTime
                            ? "w-0 opacity-0"
                            : isIntro
                            ? "w-0 opacity-0"
                            : "w-24 opacity-100"
                        }`}
          >
            <span className="text-6xl font-black not-italic tracking-tighter">
              {left.score}
            </span>
          </div>
        </div>
      </div>

      {/* CENTER LOGO */}
      <div className="z-40 w-24 h-20 bg-white flex items-center justify-center border-x border-slate-200 shadow-2xl relative">
        <div className="flex flex-col items-center justify-center w-full h-full p-1">
          <img src="/img/logo.png" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* RIGHT TEAM */}
      <div className="flex flex-col items-end relative z-20">
        {!isFullTime && !isIntro && (
          <div className="w-full flex justify-start mb-1 relative z-50">
            <StatusArea
              match={match}
              team={right}
              isLeft={false}
              resolveUrl={resolveUrl}
            />
          </div>
        )}

        <div className="flex items-center flex-row-reverse h-20 shadow-2xl relative z-20">
          <div
            className="w-24 h-full flex items-center justify-center z-30 relative p-1 pr-8"
            style={{ backgroundColor: right.color || "#333" }}
          >
            {right.flag ? (
              <img
                src={resolveUrl(right.flag)}
                className="w-full h-full object-contain drop-shadow-md"
              />
            ) : (
              <Shield className="text-white/50" />
            )}
          </div>

          <div
            className={`h-full flex items-center overflow-hidden relative transition-all duration-1000 flex-row-reverse ${baseWidth}`}
            style={{
              background: `linear-gradient(-90deg, ${right.color} 30%, #0f172a 100%)`,
            }}
          >
            <div className="flex items-center w-full h-full relative z-10 px-4 flex-row-reverse">
              {sR && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <img
                    src="/img/volleyball.png"
                    className="w-5 animate-spin-slow drop-shadow-md"
                  />
                </div>
              )}
              <div
                className={`flex flex-col justify-center w-full h-full items-end ${
                  sR ? "pr-6" : ""
                } perspective-container`}
              >
                <span
                  className={`uppercase tracking-tight leading-none whitespace-nowrap truncate 
                                    ${
                                      isIntro
                                        ? "text-5xl font-black"
                                        : "text-6xl font-black"
                                    } 
                                    ${
                                      sR && !isIntro
                                        ? "vnl-text-base vnl-warp-right"
                                        : "drop-shadow-md"
                                    }
                                `}
                >
                  {isIntro
                    ? right.name
                    : right.shortName ||
                      right.country ||
                      right.name.substring(0, 3)}
                </span>
              </div>
            </div>
          </div>

          {/* SETS */}
          <div
            className={`h-full flex bg-slate-800 border-x border-white/10 transition-all duration-700 overflow-hidden items-center justify-center relative z-20
                        ${
                          isFullTime
                            ? "w-24 bg-slate-900"
                            : isIntro
                            ? "w-0 opacity-0"
                            : "w-16 opacity-100"
                        } animate-slide-in-right`}
          >
            <span className="absolute top-1 text-[16px] text-slate-400 tracking-widest font-bold">
              SETS
            </span>
            <span
              className={`font-black leading-none text-white mt-4 transition-all duration-700 ${
                isFullTime ? "text-5xl scale-110" : "text-3xl"
              }`}
            >
              {right.sets}
            </span>
            {!isFullTime && (
              <span className="absolute top-1 text-[16px] text-slate-400 tracking-widest font-bold">
                SETS
              </span>
            )}
          </div>

          {/* SCORE */}
          <div
            className={`h-full flex items-center justify-center bg-[#f05c22] text-white transition-all duration-700 ease-in-out overflow-hidden
                        ${
                          isFullTime
                            ? "w-0 opacity-0"
                            : isIntro
                            ? "w-0 opacity-0"
                            : "w-24 opacity-100"
                        } animate-slide-in-right`}
          >
            <span className="text-6xl font-black not-italic tracking-tighter">
              {right.score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STATUS AREA (UPDATED: Team Color Top Border for Active Player)
// ==========================================
function StatusArea({ match, team, status, isLeft, resolveUrl }) {
  const s = match.subData || {};
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (team.activeTimeout) {
      const interval = setInterval(() => setNow(Date.now()), 500);
      return () => clearInterval(interval);
    }
  }, [team.activeTimeout]);
  const isTimeout =
    team.activeTimeout && team.timeoutExpires && team.timeoutExpires > now;
  const isSubActive =
    match.graphicsVisible &&
    match.activeView === "substitution" &&
    s.visible &&
    s.teamId === team.id;
  const s1 = team.score || 0;
  const s2 =
    (match.teamA.id === team.id ? match.teamB.score : match.teamA.score) || 0;
  const setNum = (match.teamA.sets || 0) + (match.teamB.sets || 0) + 1;
  const limit = setNum === 5 ? 15 : 25;
  let isSetPoint = null;
  if (s1 >= limit - 1 && s1 > s2)
    isSetPoint = team.sets === 2 || setNum === 5 ? "MATCH POINT" : "SET POINT";
  if (s1 >= limit && s1 >= s2 + 2) isSetPoint = null;
  const activePlayer = team.roster?.find((p) => p.id === match.activePlayerId);
  const isPlayerActive = match.graphicsVisible && activePlayer && !isTimeout;
  const [subPhase, setSubPhase] = useState(null);
  useEffect(() => {
    if (isSubActive) {
      setSubPhase("arrows-in");
      const t1 = setTimeout(() => setSubPhase("show-in"), 2000);
      const t2 = setTimeout(() => setSubPhase("arrows-out"), 5000);
      const t3 = setTimeout(() => setSubPhase("show-out"), 7000);
      const t4 = setTimeout(() => setSubPhase("done"), 10000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      setSubPhase(null);
    }
  }, [isSubActive, s.inId, s.outId]);

  const subClasses = isLeft
    ? "mr-[160px] rounded-tl-lg"
    : "ml-[160px] rounded-tr-lg";
  const playerClasses = isLeft
    ? "ml-0 mr-[160px] rounded-tl-lg"
    : "mr-0 ml-[160px] rounded-tr-lg";

  if (isSubActive && subPhase && subPhase !== "done") {
    const pIn = team.roster?.find((p) => p.id === s.inId);
    const pOut = team.roster?.find((p) => p.id === s.outId);
    if (!pIn || !pOut) return null;
    if (subPhase === "arrows-in" || subPhase === "arrows-out") {
      const isUp = subPhase === "arrows-in";
      const accentColor = isUp ? "text-green-500" : "text-red-500";
      const animateClass = isUp ? "animate-arrows-up" : "animate-arrows-down";
      const Icon = isUp ? ChevronsUp : ChevronsDown;
      return (
        <div
          className={`h-16 w-full bg-[#1a1a2e] border-t-4 border-white/20 shadow-2xl flex items-center overflow-hidden ${subClasses}`}
        >
          <div className={`w-full h-full flex items-center justify-around`}>
            {[...Array(8)].map((_, i) => (
              <Icon
                key={i}
                size={40}
                strokeWidth={4}
                className={`${accentColor} ${animateClass}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      );
    }
    const isShowIn = subPhase === "show-in";
    const player = isShowIn ? pIn : pOut;
    const borderColor = isShowIn ? "border-green-500" : "border-red-500";
    const label = isShowIn ? "IN" : "OUT";
    const labelColor = isShowIn ? "text-green-500" : "text-red-500";
    return (
      <div
        className={`h-16 w-full bg-[#1a1a2e] border-t-4 ${borderColor} shadow-2xl flex items-center animate-in fade-in zoom-in duration-300 ${subClasses}`}
      >
        <div
          className={`w-full flex items-center px-4 ${
            isLeft ? "flex-row" : "flex-row-reverse"
          }`}
        >
          <div
            className={`flex-1 flex flex-col ${
              isLeft ? "items-start" : "items-end"
            } justify-center`}
          >
            <span className="text-2xl font-black uppercase leading-none text-white truncate w-full">
              {player.name}
            </span>
            <span
              className={`text-xs font-bold ${labelColor} uppercase tracking-widest`}
            >
              SUBSTITUTION {label}
            </span>
          </div>
          <div className="flex-shrink-0 mx-2">
            <div
              className={`w-12 h-10 ${
                isShowIn ? "bg-green-500" : "bg-red-500"
              } flex items-center justify-center transform skew-x-[-10deg] shadow-lg`}
            >
              <span className="text-3xl font-black text-white leading-none transform skew-x-[10deg]">
                {player.number}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (isTimeout)
    return (
      <div className="animate-in zoom-in duration-300 w-full">
        <TimeoutDisplay team={team} />
      </div>
    );

  // UPDATED: Team Color Top Border for Active Player
  if (isPlayerActive) {
    return (
      <div
        className={`h-16 w-full bg-[#1a1a2e] border-t-4 shadow-2xl flex items-center animate-in slide-in-from-bottom-10 duration-500 ${playerClasses}`}
        style={{ borderColor: team.color || "#f05c22" }}
      >
        <div
          className={`w-full flex items-center px-4 ${
            isLeft ? "flex-row" : "flex-row-reverse"
          }`}
        >
          <div
            className={`flex-1 flex flex-col ${
              isLeft ? "items-start" : "items-end"
            } justify-center`}
          >
            <span className="text-2xl font-black uppercase leading-none text-white truncate w-full">
              {activePlayer.name}
            </span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
              {activePlayer.position}
            </span>
          </div>
          <div className="flex-shrink-0 mx-2">
            <div className="w-12 h-10 bg-[#f05c22] flex items-center justify-center transform skew-x-[-10deg] shadow-lg">
              <span className="text-3xl font-black text-white leading-none transform skew-x-[10deg]">
                {activePlayer.number}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (isSetPoint) {
    return (
      <div
        className={`animate-in slide-in-from-bottom-2 duration-300 w-full flex ${
          isLeft ? "justify-start" : "justify-end"
        }`}
      >
        <div className="bg-white text-[#f05c22] px-6 py-1 rounded-t-lg shadow-lg flex items-center gap-2 border-b-4 border-[#f05c22] w-full justify-center">
          <span className="text-2xl font-black uppercase tracking-tight">
            {isSetPoint}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

// UPDATED: TimeoutDisplay with Reverse Progress Bar
function TimeoutDisplay({ team }) {
  const [seconds, setSeconds] = useState(30);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const updateTimer = () => {
      if (!team.timeoutExpires) {
        setSeconds(30);
        setProgress(100);
        return;
      }
      const now = Date.now();
      const leftMs = Math.max(0, team.timeoutExpires - now);
      const leftSec = Math.ceil(leftMs / 1000);
      setSeconds(leftSec);

      // Calculate progress (30 seconds = 30000ms)
      const pct = (leftMs / 30000) * 100;
      setProgress(Math.max(0, pct));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 50);
    return () => clearInterval(interval);
  }, [team.timeoutExpires]);

  return (
    <div className="bg-[#f05c22] text-white px-4 py-2 rounded-t-lg shadow-lg flex items-center justify-between relative overflow-hidden w-full">
      <span className="text-xl font-bold uppercase tracking-tight z-10">
        TIMEOUT {team.timeouts || 1}
      </span>
      <div className="bg-black text-[#f05c22] px-2 rounded font-mono font-bold text-xl min-w-[40px] text-center z-10">
        :{seconds < 10 ? `0${seconds}` : seconds}
      </div>
      {/* Reverse Progress Bar (Black) */}
      <div
        className="absolute bottom-0 left-0 h-1.5 bg-[#2F36CF] transition-all duration-75 linear"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}

// ==========================================
// STANDINGS, MATCH RESULT (UNTOUCHED)
// ==========================================
function StandingsSection({ matches, teams, resolveUrl, viewMode }) {
  const { currentData, currentTitle } = useMemo(() => {
    const stats = {};
    teams.forEach((t) => {
      stats[t.id] = {
        id: t.id,
        name: t.name,
        group: t.group || "A",
        flag: t.flag,
        played: 0,
        won: 0,
        lost: 0,
        pts: 0,
        setsWon: 0,
        setsLost: 0,
      };
    });
    matches.forEach((m) => {
      if (m.status === "Finished") {
        const sA = m.teamA.sets || 0;
        const sB = m.teamB.sets || 0;
        const winnerId = sA > sB ? m.teamA.id : m.teamB.id;
        const loserId = sA > sB ? m.teamB.id : m.teamA.id;
        if (stats[winnerId]) {
          stats[winnerId].played++;
          stats[winnerId].won++;
          stats[winnerId].setsWon += Math.max(sA, sB);
          stats[winnerId].setsLost += Math.min(sA, sB);
          stats[winnerId].pts += sA + sB < 5 ? 3 : 2;
        }
        if (stats[loserId]) {
          stats[loserId].played++;
          stats[loserId].lost++;
          stats[loserId].setsWon += Math.min(sA, sB);
          stats[loserId].setsLost += Math.max(sA, sB);
          stats[loserId].pts += sA + sB === 5 ? 1 : 0;
        }
      }
    });
    const allTeams = Object.values(stats);
    const groupA = allTeams
      .filter((t) => t.group === "A")
      .sort((a, b) => b.pts - a.pts);
    const groupB = allTeams
      .filter((t) => t.group === "B")
      .sort((a, b) => b.pts - a.pts);
    if (viewMode === "standings_A")
      return { currentData: groupA, currentTitle: "POOL A STANDINGS" };
    if (viewMode === "standings_B")
      return { currentData: groupB, currentTitle: "POOL B STANDINGS" };
    return { currentData: groupA, currentTitle: "STANDINGS" };
  }, [matches, teams, viewMode]);

  const RenderTable = ({ title, data }) => (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col h-full flex-1`}
    >
      <div className="bg-[#2F36CF] text-white px-6 py-2 font-vnl flex justify-between items-center border-b-4 border-white/20">
        <span className="text-3xl font-black uppercase tracking-widest italic">
          {title}
        </span>
        <img
          src="/img/ledlogo.png"
          className="h-8 object-contain drop-shadow-md"
        />
      </div>
      <div className="bg-[#1a1a2e] grid grid-cols-12 p-2 font-bold text-slate-400 text-sm uppercase tracking-widest text-center border-b border-white/10">
        <div className="col-span-1">#</div>
        <div className="col-span-6 text-left pl-2">Team</div>
        <div className="col-span-1">P</div>
        <div className="col-span-1">W</div>
        <div className="col-span-1">L</div>
        <div className="col-span-2">PTS</div>
      </div>
      <div className="bg-white text-slate-900 flex-1">
        {data.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-12 p-2 border-b border-slate-200 items-center text-center font-vnl font-bold text-2xl animate-row-slide"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="col-span-1 flex justify-center">
              <div className="bg-slate-800 text-white w-8 h-8 rounded flex items-center justify-center text-lg">
                {i + 1}
              </div>
            </div>
            <div className="col-span-6 text-left pl-2 flex items-center gap-2">
              <div className="w-10 h-6 bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden rounded">
                {row.flag ? (
                  <img
                    src={resolveUrl(row.flag)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Shield className="text-slate-300 w-4 h-4" />
                )}
              </div>
              <span className="font-black uppercase text-2xl truncate tracking-tight">
                {row.name}
              </span>
            </div>
            <div className="col-span-1 text-slate-500">{row.played}</div>
            <div className="col-span-1 text-green-700">{row.won}</div>
            <div className="col-span-1 text-red-600">{row.lost}</div>
            <div className="col-span-2 flex justify-center">
              <div className="bg-[#f05c22] text-white w-16 py-0 rounded shadow-inner text-2xl font-black italic">
                {row.pts}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center animate-slide-up">
      <div
        className={`h-[700px] flex gap-8 transition-all duration-500 w-[1000px]`}
      >
        <RenderTable title={currentTitle} data={currentData} />
      </div>
    </div>
  );
}

function MatchResultSection({ match, left, right, resolveUrl }) {
  const history = match.setHistory || [];
  const setsToShow = [1, 2, 3, 4, 5];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center animate-slide-up">
      <div className="flex flex-col items-center w-[1200px]">
        <div className="bg-[#2F36CF] text-white px-12 py-3 font-vnl font-black uppercase tracking-widest text-4xl rounded-t-lg shadow-lg border-b-4 border-white/20">
          MATCH RESULT
        </div>
        <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-b-xl border-t-4 border-[#2F36CF] p-8 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-8">
            <div className="flex flex-col items-center w-1/3">
              {left.flag ? (
                <img
                  src={resolveUrl(left.flag)}
                  className="h-32 object-contain mb-4 drop-shadow-md"
                />
              ) : (
                <Shield size={100} className="text-slate-300 mb-4" />
              )}
              <div className="text-6xl font-black font-vnl uppercase text-white">
                {left.name}
              </div>
            </div>
            <div className="flex items-center gap-10">
              <span
                className={`text-[150px] font-black font-vnl leading-none ${
                  left.sets > right.sets ? "text-[#f05c22]" : "text-white"
                }`}
              >
                {left.sets}
              </span>
              <span className="text-6xl font-bold text-slate-500">-</span>
              <span
                className={`text-[150px] font-black font-vnl leading-none ${
                  right.sets > left.sets ? "text-[#f05c22]" : "text-white"
                }`}
              >
                {right.sets}
              </span>
            </div>
            <div className="flex flex-col items-center w-1/3">
              {right.flag ? (
                <img
                  src={resolveUrl(right.flag)}
                  className="h-32 object-contain mb-4 drop-shadow-md"
                />
              ) : (
                <Shield size={100} className="text-slate-300 mb-4" />
              )}
              <div className="text-6xl font-black font-vnl uppercase text-white">
                {right.name}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {setsToShow.map((setNum) => {
              const h = history.find((x) => x.set === setNum);
              if (!h) return null;
              return (
                <div
                  key={setNum}
                  className="flex flex-col items-center bg-white/10 px-6 py-3 rounded border border-white/10"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    SET {setNum}
                  </span>
                  <div className="text-3xl font-mono font-bold text-white">
                    <span
                      className={
                        h.scoreA > h.scoreB ? "text-yellow-400" : "text-white"
                      }
                    >
                      {h.scoreA}
                    </span>
                    <span className="mx-2 text-slate-500">-</span>
                    <span
                      className={
                        h.scoreB > h.scoreA ? "text-yellow-400" : "text-white"
                      }
                    >
                      {h.scoreB}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function SingleRefereeSection({ match, activeRef }) {
  const isRef1 = activeRef === "referee1";
  const refData = isRef1 ? match.referee1 : match.referee2;
  if (!refData) return null;
  return (
    <div className="absolute bottom-20 left-0 w-full animate-slide-up flex flex-col items-center z-50">
      <div className="bg-[#2F36CF] text-white px-12 py-2 font-vnl font-bold uppercase tracking-widest text-2xl rounded-t-lg shadow-lg">
        {isRef1 ? "1st Referee" : "2nd Referee"}
      </div>
      <div className="bg-[#1a1a2e] text-white px-24 py-6 rounded-b-xl border-t-4 border-[#f05c22] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[700px]">
        <span className="text-4xl font-vnl font-black uppercase tracking-wide leading-none">
          {refData.name || "OFFICIAL"}
        </span>
        {refData.country && (
          <span className="text-2xl text-slate-400 font-bold uppercase tracking-widest mt-2">
            {refData.country}
          </span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// LINEUP SECTION (UPDATED: Team Color Top Border for Hero)
// ==========================================
function LineupSection({ team, ids, step, resolveUrl }) {
  if (!team) return null;
  const players = useMemo(() => {
    let list = (ids || [])
      .map((id) => team.roster?.find((p) => p.id === id))
      .filter(Boolean);
    if (list.length < 7) list = [...list, ...Array(7 - list.length).fill(null)];
    const summaryList = [...list];
    const liberoIndex = summaryList.findIndex(
      (p) =>
        p &&
        (p.position === "Libero" || p.position === "L" || p.position === "LB")
    );
    if (liberoIndex !== -1 && liberoIndex !== 3) {
      const temp = summaryList[3];
      summaryList[3] = summaryList[liberoIndex];
      summaryList[liberoIndex] = temp;
    }
    return { sequence: list, summary: summaryList };
  }, [ids, team.roster]);
  const showIntro = step === 0;
  const showSummary = step > 7;
  const currentPlayer =
    !showIntro && !showSummary ? players.sequence[step - 1] : null;
  const isVideo = (url) =>
    url && (url.match(/\.(webm|mp4|mov)$/i) || url.startsWith("data:video"));
  const positions = [
    { label: "1", top: "65%", left: "75%" },
    { label: "2", top: "25%", left: "75%" },
    { label: "3", top: "25%", left: "50%" },
    { label: "4", top: "25%", left: "25%" },
    { label: "5", top: "65%", left: "25%" },
    { label: "6", top: "65%", left: "50%" },
    { label: "L", top: "85%", left: "50%" },
  ];
  const formationMapping = [3, 2, 1, 4, 5, 0, 6];

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* --- MOVING HEADER CONTAINER --- */}
      <div
        className={`absolute transition-all duration-1000 ease-in-out z-50 flex items-center 
                    ${
                      showIntro
                        ? "flex-col gap-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        : "flex-row gap-6 top-10 left-10 translate-x-0 translate-y-0 scale-75 origin-top-left"
                    }
                `}
      >
        {/* Images */}
        <div className={`flex items-center gap-6 filter drop-shadow-2xl`}>
          {team.flag && (
            <img
              src={resolveUrl(team.flag)}
              className={`${
                showIntro ? "h-48" : "h-32"
              } w-auto object-contain transition-all duration-1000`}
              alt="Flag"
            />
          )}
          {team.logo && (
            <img
              src={resolveUrl(team.logo)}
              className={`${
                showIntro ? "h-48" : "h-32"
              } w-auto object-contain transition-all duration-1000`}
              alt="Logo"
            />
          )}
          {!team.flag && !team.logo && (
            <Shield size={showIntro ? 128 : 80} className="text-slate-300" />
          )}
        </div>

        {/* Text Group */}
        <div
          className={`flex flex-col ${
            showIntro ? "items-center text-center" : "items-start text-left"
          }`}
        >
          <div
            className="text-7xl font-vnl font-black text-white uppercase italic drop-shadow-lg tracking-tighter leading-none whitespace-nowrap mb-2"
            style={{ textShadow: "4px 4px 0px rgba(0,0,0,0.8)" }}
          >
            STARTING LINEUP
          </div>
          <div
            className={`text-5xl font-bold text-white uppercase tracking-widest bg-slate-900/80 px-8 py-2 rounded shadow-lg border-l-8`}
            style={{ borderColor: team.color, color: team.color }}
          >
            {team.name}
          </div>
        </div>
      </div>

      {/* PLAYER CARD (UPDATED: Top Border with Team Color) */}
      {currentPlayer && (
        <div
          key={currentPlayer.id}
          className="absolute left-20 bottom-28 h-[80%] w-[40%] z-40 flex items-end justify-center animate-pop-in"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[35rem] font-black text-white/10 select-none z-0">
            {currentPlayer.number}
          </div>
          <div className="h-full w-auto relative z-10 flex items-end justify-center">
            {isVideo(currentPlayer.photo) ? (
              <video
                src={resolveUrl(currentPlayer.photo)}
                autoPlay
                muted
                playsInline
                className="h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                onEnded={(e) => e.target.pause()}
              />
            ) : (
              <img
                src={resolveUrl(currentPlayer.photo)}
                className="h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
              />
            )}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center z-20 w-full flex flex-col items-center">
            {/* Changed border-b-8 to border-t-4 */}
            <div
              className="bg-slate-900/90 backdrop-blur-md px-8 py-2 rounded-xl border-t-4 shadow-2xl transform skew-x-[-10deg]"
              style={{ borderColor: team.color || "#f05c22" }}
            >
              <div className="transform skew-x-[10deg]">
                <div className="flex items-center justify-center gap-4 mb-1">
                  <span className="text-2xl font-black text-yellow-400 font-vnl bg-white/10 px-3 py-1 rounded">
                    #{currentPlayer.number}
                  </span>
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-300">
                    {currentPlayer.position}
                  </span>
                </div>
                <div className="text-5xl font-black font-vnl uppercase italic leading-none whitespace-nowrap text-white drop-shadow-md">
                  {currentPlayer.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POSITION MAP */}
      {!showIntro && !showSummary && (
        <div className="absolute right-10 top-[45%] -translate-y-1/2 w-[1000px] h-[750px] z-30">
          {players.sequence.map((p, i) => {
            const posConfig = positions[formationMapping[i] % 7];
            const isRevealed = i < step;
            const isCurrent = i === step - 1;
            if (!isRevealed || !p) return null;
            return (
              <div
                key={i}
                className={`absolute flex flex-col items-center justify-center transition-all duration-500 ${
                  isCurrent
                    ? "scale-125 z-50 animate-pop-in"
                    : "scale-100 z-10 opacity-90"
                }`}
                style={{
                  top: posConfig.top,
                  left: posConfig.left,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="w-40 h-56 rounded-lg border-2 overflow-hidden bg-slate-900 shadow-2xl relative"
                  style={{ borderColor: team.color }}
                >
                  {isVideo(p.photo) ? (
                    <video
                      src={resolveUrl(p.photo)}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                      onEnded={(e) => e.target.pause()}
                    />
                  ) : (
                    <img
                      src={resolveUrl(p.photo)}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 right-0 bg-slate-900/80 px-2 text-3xl font-black text-white italic rounded-tl-lg">
                    {p.number}
                  </div>
                </div>
                <div className="mt-2 bg-black/90 text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider shadow-lg border border-white/10 flex flex-col items-center leading-tight">
                  <span>{p.name.split(" ")[0]}</span>
                  <span className="text-[10px] text-slate-300">
                    {p.position}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUMMARY */}
      {showSummary && (
        <div className="w-full h-full flex flex-col items-center justify-end pb-64 animate-slide-up">
          <div className="flex justify-center items-end gap-4 w-full px-10 h-[600px]">
            {players.summary.map((p, i) => (
              <div
                key={i}
                className="relative flex-1 h-full bg-slate-900/90 rounded-t-lg overflow-hidden border-t-4 shadow-2xl group transition-all duration-500 hover:w-[20%]"
                style={{ borderColor: team.color || "#333" }}
              >
                {p ? (
                  <>
                    <div className="absolute inset-0 bg-slate-800">
                      {isVideo(p.photo) ? (
                        <video
                          src={resolveUrl(p.photo)}
                          className="w-full h-full object-cover object-top opacity-90"
                          autoPlay
                          muted
                          playsInline
                          onEnded={(e) => e.target.pause()}
                        />
                      ) : (
                        <img
                          src={resolveUrl(p.photo)}
                          className="w-full h-full object-cover object-top opacity-90"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    </div>
                    <div className="absolute bottom-0 w-full p-4 text-center">
                      <div className="text-5xl font-black text-white/20 absolute top-2 right-2 z-0">
                        {p.number}
                      </div>
                      <div className="relative z-10">
                        <div className="text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded mb-1 backdrop-blur-md uppercase">
                          {p.position}
                        </div>
                        <div className="text-2xl font-black uppercase italic leading-none drop-shadow-md truncate">
                          {p.name.split(" ")[0]}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 font-bold">
                    EMPTY
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
