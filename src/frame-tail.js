function boot(n){
  var S=window.__S;
  /* Team HQ waits for every file before it draws; once the core ones are in (from this
     browser's last copy or the relay), draw now and let the rest fill in as they arrive. */
  if(S && !S.ready && S.tab && window.__show && S.tasks && S.tasks.length && S.people && S.people.length && S.rocks && S.rocks.length){
    S.ready=true; try{ window.__show(S.tab); }catch(e){}
  }
  if(!(S && S.ready && window.__show && document.getElementById('app-mine'))){ if((n||0)<1200) setTimeout(function(){ boot((n||0)+1); }, 100); return; }
  MODS.forEach(function(m){ try{ m(); }catch(e){ try{ console.error('Team HQ upgrade failed to load', e); }catch(x){} } });
}
boot(0);
})();