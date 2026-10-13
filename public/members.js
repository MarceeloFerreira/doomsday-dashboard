
var DASH_FARM=["Kris2","Ganshel"];
var DASH_EVLABEL={A:'Arquipelágo',G:'Gênesis',I:'Insular'};
var DASH_ROSTER=["ARES","Alen_","Aninha","Avatar","Ayon","Beto_Brasil","BrianMannrich","Bronks","CAUEZERA","Calvin","Carlos","Caslu","Catrina","Chuy","Conan","Cronos","Daenerys","DarkNatsu","Death","Deleti","Dziro","Edwhois","ElWalas","Ewerton79","Felyppe","Guigo","Gus","IronLegacy","Jin","Jojo","Juci","Jukera","Ka","Kaverna","KengoBRAZIL","Kris","Kuky","Light","LuizaGuedes24","May","Mr_Potato","Nadia","Nato","Nitroxido","Orochi","Pardal","PoppA","Radamanthys","Rish","Rodrigues","Sabada","Santk","ScorpionMago","Sidney","Sioux","Sis_Tina","Skull","SmacKDowN","Stubi","SurvivorHoracio","TCAS","Tata","Tbest","Teleze","Tiifa","ToNi","Vhagar","Viking","Viniciusfmv","William","brupnopiz","killerEduardo"];

(function(){
  // ---- indicador de "tem mais abas pra rolar" no menu superior (mobile) ----
  (function(){
    var links = document.querySelector('.topmenu-links');
    if (!links) return;
    function updateScrollHint(){
      var hasOverflow = links.scrollWidth > links.clientWidth + 2;
      var atEnd = links.scrollLeft + links.clientWidth >= links.scrollWidth - 2;
      links.classList.toggle('has-more', hasOverflow && !atEnd);
    }
    links.addEventListener('scroll', updateScrollHint);
    window.addEventListener('resize', updateScrollHint);
    updateScrollHint();
  })();

  // ---- copiar ID de jogador (usado pra localizar o jogador dentro do jogo) ----
  function fallbackCopyText(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.copy-id-btn');
    if(!btn) return;
    var id = btn.getAttribute('data-id');
    var prevLabel = btn.textContent;
    function markCopied(){
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      setTimeout(function(){ btn.textContent = prevLabel; btn.classList.remove('copied'); }, 1400);
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(id).then(markCopied).catch(function(){ fallbackCopyText(id); markCopied(); });
    } else {
      fallbackCopyText(id);
      markCopied();
    }
  });

  // ---- sub-menu inside "Acesso de Membros": Desempenho da Aliança / Cálculos do Supremo ----
  var dashSubmenu = document.getElementById('dash-submenu');
  if(dashSubmenu){
    dashSubmenu.addEventListener('click', function(e){
      var btn = e.target.closest('.dash-submenu-btn');
      if(!btn) return;
      var target = btn.getAttribute('data-subview');
      if(location.pathname==='/membros'){var url=new URL(location.href);url.searchParams.set('aba',target);history.replaceState(null,'',url);}
      dashSubmenu.querySelectorAll('.dash-submenu-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.dash-subpanel').forEach(function(p){ p.classList.toggle('active', p.id === 'subview-' + target); });
    });
  }

  var requestedMemberTab=new URLSearchParams(location.search).get('aba');
  var requestedMemberButton=dashSubmenu&&Array.from(dashSubmenu.querySelectorAll('.dash-submenu-btn')).find(function(b){return b.getAttribute('data-subview')===requestedMemberTab;});
  if(requestedMemberButton)requestedMemberButton.click();

  // ---- Supremo: sub-tabs (Resumo / Dia 1-6) ----
  var supTabs = document.getElementById('sup-tabs');
  var subviewSupremo = document.getElementById('subview-supremo');
  if(supTabs){
    supTabs.addEventListener('click', function(e){
      var btn = e.target.closest('.sup-tab-btn');
      if(!btn) return;
      var target = btn.getAttribute('data-suptab');
      supTabs.querySelectorAll('.sup-tab-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
      subviewSupremo.querySelectorAll('.sup-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'sup-panel-' + target); });
    });
  }

  // ---- Utilitários: sub-tabs (Herói / Oficina / XP Heróis) ----
  var utilTabs = document.getElementById('util-tabs');
  var tabUtil = document.getElementById('subview-util');
  if(utilTabs){
    utilTabs.addEventListener('click', function(e){
      var btn = e.target.closest('.sup-tab-btn');
      if(!btn) return;
      var target = btn.getAttribute('data-utiltab');
      utilTabs.querySelectorAll('.sup-tab-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
      tabUtil.querySelectorAll('.sup-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'sup-panel-' + target); });
    });
  }


  // ================= SUPREMO: dados =================
  var SUP_OFICINA_ITEMS_RAW = [["Light Protection", 1, 0, 0, 45.0, 2.0, 800.0], ["Light Protection", 1, 1, 0, 55.0, 2.0, 800.0], ["Light Protection", 1, 2, 0, 60.0, 2.0, 1200.0], ["Light Protection", 1, 3, 0, 70.0, 2.0, 1600.0], ["Light Protection", 1, 4, 0, 75.0, 2.0, 2000.0], ["Light Protection", 1, 5, 0, 360.0, 10.0, 2500.0], ["Light Protection", 1, 6, 0, 170.0, 5.0, 4500.0], ["Light Protection", 1, 7, 0, 190.0, 5.0, 5500.0], ["Light Protection", 1, 8, 0, 215.0, 5.0, 6600.0], ["Light Protection", 1, 9, 0, 205.0, 6.0, 7700.0], ["Light Protection", 1, 10, 0, 860.0, 36.0, 8900.0], ["Light Protection", 1, 11, 0, 465.0, 13.0, 14800.0], ["Light Protection", 1, 12, 0, 525.0, 14.0, 17400.0], ["Light Protection", 1, 13, 0, 555.0, 15.0, 20300.0], ["Light Protection", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Light Protection", 1, 15, 0, 0, 0, 38800.0], ["Light Protection", 2, 0, 0, 330.0, 9.0, 44800.0], ["Light Protection", 2, 1, 0, 375.0, 10.0, 44800.0], ["Light Protection", 2, 2, 0, 390.0, 11.0, 46900.0], ["Light Protection", 2, 3, 0, 435.0, 12.0, 49100.0], ["Light Protection", 2, 4, 0, 450.0, 13.0, 51500.0], ["Light Protection", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Light Protection", 2, 6, 0, 465.0, 13.0, 66900.0], ["Light Protection", 2, 7, 0, 525.0, 14.0, 69500.0], ["Light Protection", 2, 8, 0, 585.0, 15.0, 72400.0], ["Light Protection", 2, 9, 0, 585.0, 17.0, 75600.0], ["Light Protection", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Light Protection", 2, 11, 0, 600.0, 17.0, 95100.0], ["Light Protection", 2, 12, 0, 685.0, 18.0, 98500.0], ["Light Protection", 2, 13, 0, 725.0, 20.0, 102200.0], ["Light Protection", 2, 14, 0, 805.0, 21.0, 106200.0], ["Light Protection", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Light Protection", 2, 16, 0, 795.0, 22.0, 131900.0], ["Light Protection", 2, 17, 0, 870.0, 24.0, 136300.0], ["Light Protection", 2, 18, 0, 940.0, 26.0, 141100.0], ["Light Protection", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Light Protection", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Light Protection", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Light Protection", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Light Protection", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Light Protection", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Light Protection", 2, 25, 0, 0, 0, 232600.0], ["Light Protection", 3, 0, 0, 660.0, 18.0, 348100.0], ["Light Protection", 3, 1, 0, 705.0, 20.0, 352100.0], ["Light Protection", 3, 2, 0, 780.0, 21.0, 356400.0], ["Light Protection", 3, 3, 0, 825.0, 23.0, 361000.0], ["Light Protection", 3, 4, 0, 865.0, 23.0, 365700.0], ["Light Protection", 3, 5, 10.0, 3705.0, 134.0, 388900.0], ["Light Protection", 3, 6, 0, 795.0, 22.0, 393300.0], ["Light Protection", 3, 7, 0, 850.0, 24.0, 398100.0], ["Light Protection", 3, 8, 0, 930.0, 25.0, 403200.0], ["Light Protection", 3, 9, 0, 975.0, 26.0, 408500.0], ["Light Protection", 3, 10, 10.0, 3895.0, 162.0, 434800.0], ["Light Protection", 3, 11, 0, 900.0, 25.0, 439800.0], ["Light Protection", 3, 12, 0, 990.0, 26.0, 445200.0], ["Light Protection", 3, 13, 0, 1050.0, 28.0, 450900.0], ["Light Protection", 3, 14, 0, 1075.0, 29.0, 456800.0], ["Light Protection", 3, 15, 10.0, 4325.0, 178.0, 485800.0], ["Light Protection", 3, 16, 0, 990.0, 28.0, 491300.0], ["Light Protection", 3, 17, 0, 1060.0, 30.0, 497200.0], ["Light Protection", 3, 18, 0, 1165.0, 32.0, 503600.0], ["Light Protection", 3, 19, 0, 1195.0, 33.0, 510200.0], ["Light Protection", 3, 20, 15.0, 4945.0, 199.0, 543000.0], ["Light Protection", 3, 21, 0, 1125.0, 31.0, 549500.0], ["Light Protection", 3, 22, 0, 1210.0, 33.0, 556500.0], ["Light Protection", 3, 23, 0, 1300.0, 36.0, 564000.0], ["Light Protection", 3, 24, 0, 1365.0, 37.0, 571500.0], ["Light Protection", 3, 25, 15.0, 5485.0, 224.0, 608500.0], ["Light Protection", 3, 26, 0, 1255.0, 35.0, 615500.0], ["Light Protection", 3, 27, 0, 1380.0, 37.0, 623000.0], ["Light Protection", 3, 28, 0, 1455.0, 40.0, 631000.0], ["Light Protection", 3, 29, 0, 1530.0, 41.0, 639500.0], ["Light Protection", 3, 30, 15.0, 6130.0, 252.0, 681000.0], ["Light Protection", 3, 31, 0, 1430.0, 39.0, 689000.0], ["Light Protection", 3, 32, 0, 1515.0, 42.0, 697500.0], ["Light Protection", 3, 33, 0, 1635.0, 45.0, 706500.0], ["Light Protection", 3, 34, 0, 1715.0, 46.0, 716000.0], ["Light Protection", 3, 35, 20.0, 6860.0, 279.0, 762000.0], ["Light Protection", 3, 36, 0, 1575.0, 44.0, 771000.0], ["Light Protection", 3, 37, 0, 1710.0, 47.0, 780500.0], ["Light Protection", 3, 38, 0, 1845.0, 50.0, 791000.0], ["Light Protection", 3, 39, 0, 1905.0, 52.0, 801500.0], ["Light Protection", 3, 40, 20.0, 7705.0, 314.0, 853000.0], ["Light Protection", 3, 41, 0, 1780.0, 49.0, 863000.0], ["Light Protection", 3, 42, 0, 1905.0, 53.0, 873500.0], ["Light Protection", 3, 43, 0, 2055.0, 56.0, 885000.0], ["Light Protection", 3, 44, 0, 2130.0, 58.0, 897000.0], ["Light Protection", 3, 45, 20.0, 8645.0, 348.0, 954500.0], ["Light Protection", 3, 46, 0, 1980.0, 55.0, 965500.0], ["Light Protection", 3, 47, 0, 2160.0, 59.0, 977500.0], ["Light Protection", 3, 48, 0, 2305.0, 63.0, 990500.0], ["Light Protection", 3, 49, 0, 2395.0, 65.0, 1004000.0], ["Light Protection", 3, 50, 25.0, 9660.0, 392.0, 1068500.0], ["Light Protection", 3, 51, 0, 2250.0, 61.0, 1081000.0], ["Light Protection", 3, 52, 0, 2425.0, 66.0, 1094500.0], ["Light Protection", 3, 53, 0, 2590.0, 70.0, 1109000.0], ["Light Protection", 3, 54, 0, 2690.0, 73.0, 1124000.0], ["Light Protection", 3, 55, 25.0, 10755.0, 441.0, 1196000.0], ["Light Protection", 3, 56, 0, 2500.0, 69.0, 1210000.0], ["Light Protection", 3, 57, 0, 2700.0, 74.0, 1225000.0], ["Light Protection", 3, 58, 0, 2890.0, 79.0, 1241000.0], ["Light Protection", 3, 59, 0, 2980.0, 82.0, 1257500.0], ["Light Protection", 3, 60, 25.0, 12125.0, 489.0, 1338000.0], ["Light Protection", 3, 61, 0, 2820.0, 77.0, 1353500.0], ["Light Protection", 3, 62, 0, 3020.0, 83.0, 1370500.0], ["Light Protection", 3, 63, 0, 3240.0, 88.0, 1388500.0], ["Light Protection", 3, 64, 0, 3345.0, 92.0, 1407000.0], ["Light Protection", 3, 65, 30.0, 13535.0, 549.0, 1497500.0], ["Light Protection", 3, 66, 0, 3155.0, 86.0, 1515000.0], ["Light Protection", 3, 67, 0, 3370.0, 93.0, 1533500.0], ["Light Protection", 3, 68, 0, 3615.0, 99.0, 1553500.0], ["Light Protection", 3, 69, 0, 3775.0, 102.0, 1574500.0], ["Light Protection", 3, 70, 30.0, 15145.0, 616.0, 1675500.0], ["Light Protection", 3, 71, 0, 3525.0, 96.0, 1695000.0], ["Light Protection", 3, 72, 0, 3805.0, 104.0, 1716000.0], ["Light Protection", 3, 73, 0, 4025.0, 111.0, 1738500.0], ["Light Protection", 3, 74, 0, 4100.0, 121.0, 1768500.0], ["Light Protection", 3, 75, 30.0, 11125.0, 600.0, 1850000.0], ["Light Protection", 3, 76, 0, 4090.0, 112.0, 1880000.0], ["Light Protection", 3, 77, 0, 4405.0, 120.0, 1910000.0], ["Light Protection", 3, 78, 0, 4695.0, 128.0, 1940000.0], ["Light Protection", 3, 79, 0, 4930.0, 134.0, 1970000.0], ["Light Protection", 3, 80, 60.0, 13965.0, 670.0, 2080000.0], ["Light Protection", 3, 81, 0, 4740.0, 129.0, 2110000.0], ["Light Protection", 3, 82, 0, 5105.0, 139.0, 2140000.0], ["Light Protection", 3, 83, 0, 5440.0, 148.0, 2170000.0], ["Light Protection", 3, 84, 0, 5710.0, 156.0, 2210000.0], ["Light Protection", 3, 85, 90.0, 17070.0, 740.0, 2330000.0], ["Light Protection", 3, 86, 0, 5495.0, 150.0, 2360000.0], ["Light Protection", 3, 87, 0, 5915.0, 161.0, 2400000.0], ["Light Protection", 3, 88, 0, 6305.0, 172.0, 2440000.0], ["Light Protection", 3, 89, 0, 6615.0, 180.0, 2480000.0], ["Light Protection", 3, 90, 120.0, 20395.0, 830.0, 2620000.0], ["Light Protection", 3, 91, 0, 6365.0, 174.0, 2660000.0], ["Light Protection", 3, 92, 0, 6850.0, 187.0, 2700000.0], ["Light Protection", 3, 93, 0, 7305.0, 199.0, 2740000.0], ["Light Protection", 3, 94, 0, 7665.0, 209.0, 2790000.0], ["Light Protection", 3, 95, 150.0, 24100.0, 945.0, 2950000.0], ["Light Protection", 3, 96, 0, 7370.0, 201.0, 3000000.0], ["Light Protection", 3, 97, 0, 7930.0, 216.0, 3050000.0], ["Light Protection", 3, 98, 0, 8460.0, 231.0, 3100000.0], ["Light Protection", 3, 99, 0, 8885.0, 242.0, 3150000.0], ["Light Protection", 3, 100, 190.0, 27910.0, 1090.0, 3340000.0], ["Light Protection", 3, 101, 0, 8535.0, 233.0, 3390000.0], ["Light Protection", 3, 102, 0, 9185.0, 251.0, 3450000.0], ["Light Protection", 3, 103, 0, 9800.0, 267.0, 3510000.0], ["Light Protection", 3, 104, 0, 10290.0, 281.0, 3570000.0], ["Light Protection", 3, 105, 230.0, 32320.0, 1265.0, 3790000.0], ["Light Protection", 3, 106, 0, 9890.0, 270.0, 3850000.0], ["Light Protection", 3, 107, 0, 10635.0, 290.0, 3910000.0], ["Light Protection", 3, 108, 0, 11350.0, 310.0, 3980000.0], ["Light Protection", 3, 109, 0, 11920.0, 325.0, 4050000.0], ["Light Protection", 3, 110, 270.0, 37430.0, 1465.0, 4300000.0], ["Light Protection", 3, 111, 0, 11455.0, 312.0, 4370000.0], ["Light Protection", 3, 112, 0, 12320.0, 336.0, 4440000.0], ["Light Protection", 3, 113, 0, 13150.0, 359.0, 4520000.0], ["Light Protection", 3, 114, 0, 13805.0, 377.0, 4600000.0], ["Light Protection", 3, 115, 310.0, 43345.0, 1695.0, 4890000.0], ["Light Protection", 3, 116, 0, 13270.0, 362.0, 4970000.0], ["Light Protection", 3, 117, 0, 14265.0, 389.0, 5050000.0], ["Light Protection", 3, 118, 0, 15230.0, 415.0, 5140000.0], ["Light Protection", 3, 119, 0, 15990.0, 436.0, 5230000.0], ["Light Protection", 3, 120, 360.0, 50195.0, 1965.0, 5560000.0], ["Light Protection", 3, 121, 0, 15375.0, 419.0, 5650000.0], ["Light Protection", 3, 122, 0, 16520.0, 451.0, 5750000.0], ["Light Protection", 3, 123, 0, 17640.0, 481.0, 5850000.0], ["Light Protection", 3, 124, 0, 18520.0, 505.0, 5960000.0], ["Light Protection", 3, 125, 420.0, 58130.0, 2275.0, 6340000.0], ["Light Fire-Control", 1, 0, 0, 45.0, 2.0, 800.0], ["Light Fire-Control", 1, 1, 0, 55.0, 2.0, 800.0], ["Light Fire-Control", 1, 2, 0, 60.0, 2.0, 1200.0], ["Light Fire-Control", 1, 3, 0, 70.0, 2.0, 1600.0], ["Light Fire-Control", 1, 4, 0, 75.0, 2.0, 2000.0], ["Light Fire-Control", 1, 5, 0, 360.0, 10.0, 2500.0], ["Light Fire-Control", 1, 6, 0, 170.0, 5.0, 4500.0], ["Light Fire-Control", 1, 7, 0, 190.0, 5.0, 5500.0], ["Light Fire-Control", 1, 8, 0, 215.0, 5.0, 6600.0], ["Light Fire-Control", 1, 9, 0, 205.0, 6.0, 7700.0], ["Light Fire-Control", 1, 10, 0, 860.0, 36.0, 8900.0], ["Light Fire-Control", 1, 11, 0, 465.0, 13.0, 14800.0], ["Light Fire-Control", 1, 12, 0, 525.0, 14.0, 17400.0], ["Light Fire-Control", 1, 13, 0, 555.0, 15.0, 20300.0], ["Light Fire-Control", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Light Fire-Control", 1, 15, 0, 0, 0, 38800.0], ["Light Fire-Control", 2, 0, 0, 330.0, 9.0, 44800.0], ["Light Fire-Control", 2, 1, 0, 375.0, 10.0, 44800.0], ["Light Fire-Control", 2, 2, 0, 390.0, 11.0, 46900.0], ["Light Fire-Control", 2, 3, 0, 435.0, 12.0, 49100.0], ["Light Fire-Control", 2, 4, 0, 450.0, 13.0, 51500.0], ["Light Fire-Control", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Light Fire-Control", 2, 6, 0, 465.0, 13.0, 66900.0], ["Light Fire-Control", 2, 7, 0, 525.0, 14.0, 69500.0], ["Light Fire-Control", 2, 8, 0, 585.0, 15.0, 72400.0], ["Light Fire-Control", 2, 9, 0, 585.0, 17.0, 75600.0], ["Light Fire-Control", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Light Fire-Control", 2, 11, 0, 600.0, 17.0, 95100.0], ["Light Fire-Control", 2, 12, 0, 685.0, 18.0, 98500.0], ["Light Fire-Control", 2, 13, 0, 725.0, 20.0, 102200.0], ["Light Fire-Control", 2, 14, 0, 805.0, 21.0, 106200.0], ["Light Fire-Control", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Light Fire-Control", 2, 16, 0, 795.0, 22.0, 131900.0], ["Light Fire-Control", 2, 17, 0, 870.0, 24.0, 136300.0], ["Light Fire-Control", 2, 18, 0, 940.0, 26.0, 141100.0], ["Light Fire-Control", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Light Fire-Control", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Light Fire-Control", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Light Fire-Control", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Light Fire-Control", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Light Fire-Control", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Light Fire-Control", 2, 25, 0, 0, 0, 232600.0], ["Light Armor Kit", 1, 0, 0, 45.0, 2.0, 800.0], ["Light Armor Kit", 1, 1, 0, 55.0, 2.0, 800.0], ["Light Armor Kit", 1, 2, 0, 60.0, 2.0, 1200.0], ["Light Armor Kit", 1, 3, 0, 70.0, 2.0, 1600.0], ["Light Armor Kit", 1, 4, 0, 75.0, 2.0, 2000.0], ["Light Armor Kit", 1, 5, 0, 360.0, 10.0, 2500.0], ["Light Armor Kit", 1, 6, 0, 170.0, 5.0, 4500.0], ["Light Armor Kit", 1, 7, 0, 190.0, 5.0, 5500.0], ["Light Armor Kit", 1, 8, 0, 215.0, 5.0, 6600.0], ["Light Armor Kit", 1, 9, 0, 205.0, 6.0, 7700.0], ["Light Armor Kit", 1, 10, 0, 860.0, 36.0, 8900.0], ["Light Armor Kit", 1, 11, 0, 465.0, 13.0, 14800.0], ["Light Armor Kit", 1, 12, 0, 525.0, 14.0, 17400.0], ["Light Armor Kit", 1, 13, 0, 555.0, 15.0, 20300.0], ["Light Armor Kit", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Light Armor Kit", 1, 15, 0, 0, 0, 38800.0], ["Light Armor Kit", 2, 0, 0, 330.0, 9.0, 44800.0], ["Light Armor Kit", 2, 1, 0, 375.0, 10.0, 44800.0], ["Light Armor Kit", 2, 2, 0, 390.0, 11.0, 46900.0], ["Light Armor Kit", 2, 3, 0, 435.0, 12.0, 49100.0], ["Light Armor Kit", 2, 4, 0, 450.0, 13.0, 51500.0], ["Light Armor Kit", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Light Armor Kit", 2, 6, 0, 465.0, 13.0, 66900.0], ["Light Armor Kit", 2, 7, 0, 525.0, 14.0, 69500.0], ["Light Armor Kit", 2, 8, 0, 585.0, 15.0, 72400.0], ["Light Armor Kit", 2, 9, 0, 585.0, 17.0, 75600.0], ["Light Armor Kit", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Light Armor Kit", 2, 11, 0, 600.0, 17.0, 95100.0], ["Light Armor Kit", 2, 12, 0, 685.0, 18.0, 98500.0], ["Light Armor Kit", 2, 13, 0, 725.0, 20.0, 102200.0], ["Light Armor Kit", 2, 14, 0, 805.0, 21.0, 106200.0], ["Light Armor Kit", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Light Armor Kit", 2, 16, 0, 795.0, 22.0, 131900.0], ["Light Armor Kit", 2, 17, 0, 870.0, 24.0, 136300.0], ["Light Armor Kit", 2, 18, 0, 940.0, 26.0, 141100.0], ["Light Armor Kit", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Light Armor Kit", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Light Armor Kit", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Light Armor Kit", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Light Armor Kit", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Light Armor Kit", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Light Armor Kit", 2, 25, 0, 0, 0, 232600.0], ["Engine Mod Kit", 1, 0, 0, 45.0, 2.0, 800.0], ["Engine Mod Kit", 1, 1, 0, 55.0, 2.0, 800.0], ["Engine Mod Kit", 1, 2, 0, 60.0, 2.0, 1200.0], ["Engine Mod Kit", 1, 3, 0, 70.0, 2.0, 1600.0], ["Engine Mod Kit", 1, 4, 0, 75.0, 2.0, 2000.0], ["Engine Mod Kit", 1, 5, 0, 360.0, 10.0, 2500.0], ["Engine Mod Kit", 1, 6, 0, 170.0, 5.0, 4500.0], ["Engine Mod Kit", 1, 7, 0, 190.0, 5.0, 5500.0], ["Engine Mod Kit", 1, 8, 0, 215.0, 5.0, 6600.0], ["Engine Mod Kit", 1, 9, 0, 205.0, 6.0, 7700.0], ["Engine Mod Kit", 1, 10, 0, 860.0, 36.0, 8900.0], ["Engine Mod Kit", 1, 11, 0, 465.0, 13.0, 14800.0], ["Engine Mod Kit", 1, 12, 0, 525.0, 14.0, 17400.0], ["Engine Mod Kit", 1, 13, 0, 555.0, 15.0, 20300.0], ["Engine Mod Kit", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Engine Mod Kit", 1, 15, 0, 0, 0, 38800.0], ["Engine Mod Kit", 2, 0, 0, 330.0, 9.0, 44800.0], ["Engine Mod Kit", 2, 1, 0, 375.0, 10.0, 44800.0], ["Engine Mod Kit", 2, 2, 0, 390.0, 11.0, 46900.0], ["Engine Mod Kit", 2, 3, 0, 435.0, 12.0, 49100.0], ["Engine Mod Kit", 2, 4, 0, 450.0, 13.0, 51500.0], ["Engine Mod Kit", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Engine Mod Kit", 2, 6, 0, 465.0, 13.0, 66900.0], ["Engine Mod Kit", 2, 7, 0, 525.0, 14.0, 69500.0], ["Engine Mod Kit", 2, 8, 0, 585.0, 15.0, 72400.0], ["Engine Mod Kit", 2, 9, 0, 585.0, 17.0, 75600.0], ["Engine Mod Kit", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Engine Mod Kit", 2, 11, 0, 600.0, 17.0, 95100.0], ["Engine Mod Kit", 2, 12, 0, 685.0, 18.0, 98500.0], ["Engine Mod Kit", 2, 13, 0, 725.0, 20.0, 102200.0], ["Engine Mod Kit", 2, 14, 0, 805.0, 21.0, 106200.0], ["Engine Mod Kit", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Engine Mod Kit", 2, 16, 0, 795.0, 22.0, 131900.0], ["Engine Mod Kit", 2, 17, 0, 870.0, 24.0, 136300.0], ["Engine Mod Kit", 2, 18, 0, 940.0, 26.0, 141100.0], ["Engine Mod Kit", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Engine Mod Kit", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Engine Mod Kit", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Engine Mod Kit", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Engine Mod Kit", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Engine Mod Kit", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Engine Mod Kit", 2, 25, 0, 0, 0, 232600.0], ["Light Weapon Kit", 1, 0, 0, 45.0, 2.0, 800.0], ["Light Weapon Kit", 1, 1, 0, 55.0, 2.0, 800.0], ["Light Weapon Kit", 1, 2, 0, 60.0, 2.0, 1200.0], ["Light Weapon Kit", 1, 3, 0, 70.0, 2.0, 1600.0], ["Light Weapon Kit", 1, 4, 0, 75.0, 2.0, 2000.0], ["Light Weapon Kit", 1, 5, 0, 360.0, 10.0, 2500.0], ["Light Weapon Kit", 1, 6, 0, 170.0, 5.0, 4500.0], ["Light Weapon Kit", 1, 7, 0, 190.0, 5.0, 5500.0], ["Light Weapon Kit", 1, 8, 0, 215.0, 5.0, 6600.0], ["Light Weapon Kit", 1, 9, 0, 205.0, 6.0, 7700.0], ["Light Weapon Kit", 1, 10, 0, 860.0, 36.0, 8900.0], ["Light Weapon Kit", 1, 11, 0, 465.0, 13.0, 14800.0], ["Light Weapon Kit", 1, 12, 0, 525.0, 14.0, 17400.0], ["Light Weapon Kit", 1, 13, 0, 555.0, 15.0, 20300.0], ["Light Weapon Kit", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Light Weapon Kit", 1, 15, 0, 0, 0, 38800.0], ["Light Weapon Kit", 2, 0, 0, 330.0, 9.0, 44800.0], ["Light Weapon Kit", 2, 1, 0, 375.0, 10.0, 44800.0], ["Light Weapon Kit", 2, 2, 0, 390.0, 11.0, 46900.0], ["Light Weapon Kit", 2, 3, 0, 435.0, 12.0, 49100.0], ["Light Weapon Kit", 2, 4, 0, 450.0, 13.0, 51500.0], ["Light Weapon Kit", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Light Weapon Kit", 2, 6, 0, 465.0, 13.0, 66900.0], ["Light Weapon Kit", 2, 7, 0, 525.0, 14.0, 69500.0], ["Light Weapon Kit", 2, 8, 0, 585.0, 15.0, 72400.0], ["Light Weapon Kit", 2, 9, 0, 585.0, 17.0, 75600.0], ["Light Weapon Kit", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Light Weapon Kit", 2, 11, 0, 600.0, 17.0, 95100.0], ["Light Weapon Kit", 2, 12, 0, 685.0, 18.0, 98500.0], ["Light Weapon Kit", 2, 13, 0, 725.0, 20.0, 102200.0], ["Light Weapon Kit", 2, 14, 0, 805.0, 21.0, 106200.0], ["Light Weapon Kit", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Light Weapon Kit", 2, 16, 0, 795.0, 22.0, 131900.0], ["Light Weapon Kit", 2, 17, 0, 870.0, 24.0, 136300.0], ["Light Weapon Kit", 2, 18, 0, 940.0, 26.0, 141100.0], ["Light Weapon Kit", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Light Weapon Kit", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Light Weapon Kit", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Light Weapon Kit", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Light Weapon Kit", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Light Weapon Kit", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Light Weapon Kit", 2, 25, 0, 0, 0, 232600.0], ["Power Mod Tech", 1, 0, 0, 45.0, 2.0, 800.0], ["Power Mod Tech", 1, 1, 0, 55.0, 2.0, 800.0], ["Power Mod Tech", 1, 2, 0, 60.0, 2.0, 1200.0], ["Power Mod Tech", 1, 3, 0, 70.0, 2.0, 1600.0], ["Power Mod Tech", 1, 4, 0, 75.0, 2.0, 2000.0], ["Power Mod Tech", 1, 5, 0, 360.0, 10.0, 2500.0], ["Power Mod Tech", 1, 6, 0, 170.0, 5.0, 4500.0], ["Power Mod Tech", 1, 7, 0, 190.0, 5.0, 5500.0], ["Power Mod Tech", 1, 8, 0, 215.0, 5.0, 6600.0], ["Power Mod Tech", 1, 9, 0, 205.0, 6.0, 7700.0], ["Power Mod Tech", 1, 10, 0, 860.0, 36.0, 8900.0], ["Power Mod Tech", 1, 11, 0, 465.0, 13.0, 14800.0], ["Power Mod Tech", 1, 12, 0, 525.0, 14.0, 17400.0], ["Power Mod Tech", 1, 13, 0, 555.0, 15.0, 20300.0], ["Power Mod Tech", 1, 14, 0, 2100.0, 101.0, 23400.0], ["Power Mod Tech", 1, 15, 0, 0, 0, 38800.0], ["Power Mod Tech", 2, 0, 0, 330.0, 9.0, 44800.0], ["Power Mod Tech", 2, 1, 0, 375.0, 10.0, 44800.0], ["Power Mod Tech", 2, 2, 0, 390.0, 11.0, 46900.0], ["Power Mod Tech", 2, 3, 0, 435.0, 12.0, 49100.0], ["Power Mod Tech", 2, 4, 0, 450.0, 13.0, 51500.0], ["Power Mod Tech", 2, 5, 0, 1980.0, 76.0, 54100.0], ["Power Mod Tech", 2, 6, 0, 465.0, 13.0, 66900.0], ["Power Mod Tech", 2, 7, 0, 525.0, 14.0, 69500.0], ["Power Mod Tech", 2, 8, 0, 585.0, 15.0, 72400.0], ["Power Mod Tech", 2, 9, 0, 585.0, 17.0, 75600.0], ["Power Mod Tech", 2, 10, 0, 2420.0, 99.0, 78900.0], ["Power Mod Tech", 2, 11, 0, 600.0, 17.0, 95100.0], ["Power Mod Tech", 2, 12, 0, 685.0, 18.0, 98500.0], ["Power Mod Tech", 2, 13, 0, 725.0, 20.0, 102200.0], ["Power Mod Tech", 2, 14, 0, 805.0, 21.0, 106200.0], ["Power Mod Tech", 2, 15, 0, 3150.0, 131.0, 110600.0], ["Power Mod Tech", 2, 16, 0, 795.0, 22.0, 131900.0], ["Power Mod Tech", 2, 17, 0, 870.0, 24.0, 136300.0], ["Power Mod Tech", 2, 18, 0, 940.0, 26.0, 141100.0], ["Power Mod Tech", 2, 19, 0, 1035.0, 28.0, 146300.0], ["Power Mod Tech", 2, 20, 0, 4120.0, 170.0, 152000.0], ["Power Mod Tech", 2, 21, 0, 1035.0, 29.0, 179700.0], ["Power Mod Tech", 2, 22, 0, 1140.0, 31.0, 185500.0], ["Power Mod Tech", 2, 23, 0, 1240.0, 34.0, 191800.0], ["Power Mod Tech", 2, 24, 0, 4635.0, 223.0, 198600.0], ["Power Mod Tech", 2, 25, 0, 0, 0, 232600.0]]; // [name,tier,level,blueprints,premiumMetal,highCarbonSteel,might]
  var SUP_XP_HEROIS_RAW = [[1, 100.0, 100.0, 100.0, 100.0], [2, 200.0, 300.0, 400.0, 400.0], [3, 500.0, 800.0, 900.0, 1000.0], [4, 1000.0, 1400.0, 1700.0, 1900.0], [5, 1600.0, 2300.0, 2800.0, 3100.0], [6, 2400.0, 3500.0, 4200.0, 4700.0], [7, 3400.0, 5100.0, 6100.0, 6800.0], [8, 4900.0, 7400.0, 8800.0, 9800.0], [9, 7400.0, 11100.0, 13300.0, 14800.0], [10, 10000.0, 15000.0, 18000.0, 20000.0], [11, 12500.0, 18800.0, 22500.0, 25000.0], [12, 15000.0, 22500.0, 27000.0, 30000.0], [13, 17500.0, 26300.0, 31500.0, 35000.0], [14, 20000.0, 30000.0, 31500.0, 40000.0], [15, 23000.0, 34500.0, 41400.0, 46000.0], [16, 26500.0, 39800.0, 47700.0, 53000.0], [17, 30500.0, 45800.0, 54900.0, 61000.0], [18, 35000.0, 52500.0, 63000.0, 70000.0], [19, 40000.0, 60000.0, 72000.0, 80000.0], [20, 45000.0, 67500.0, 81000.0, 90000.0], [21, 50000.0, 75000.0, 90000.0, 100000.0], [22, 55000.0, 82500.0, 99000.0, 110000.0], [23, 60000.0, 90000.0, 108000.0, 120000.0], [24, 65000.0, 97500.0, 117000.0, 130000.0], [25, 70000.0, 105000.0, 126000.0, 140000.0], [26, 75000.0, 112500.0, 135000.0, 150000.0], [27, 80000.0, 120000.0, 144000.0, 160000.0], [28, 85000.0, 127500.0, 153000.0, 170000.0], [29, 90000.0, 135000.0, 162000.0, 180000.0], [30, 97000.0, 145500.0, 174600.0, 194000.0], [31, 106000.0, 159000.0, 190800.0, 212000.0], [32, 117000.0, 175500.0, 210600.0, 234000.0], [33, 130000.0, 195000.0, 234000.0, 260000.0], [34, 145000.0, 217500.0, 261000.0, 290000.0], [35, 162000.0, 243000.0, 291600.0, 324000.0], [36, 181000.0, 271500.0, 325800.0, 362000.0], [37, 202000.0, 303000.0, 363600.0, 404000.0], [38, 225000.0, 337500.0, 405000.0, 450000.0], [39, 250000.0, 375000.0, 450000.0, 500000.0], [40, 290000.0, 435000.0, 522000.0, 580000.0], [41, 350000.0, 525000.0, 630000.0, 700000.0], [42, 430000.0, 645000.0, 774000.0, 860000.0], [43, 530000.0, 795000.0, 954000.0, 1060000.0], [44, 650000.0, 975000.0, 1170000.0, 1300000.0], [45, 790000.0, 1185000.0, 1422000.0, 1580000.0], [46, 950000.0, 1425000.0, 1710000.0, 1900000.0], [47, 1130000.0, 1695000.0, 2034000.0, 2260000.0], [48, 1330000.0, 1995000.0, 2394000.0, 2660000.0], [49, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [50, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [51, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [52, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [53, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [54, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [55, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [56, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [57, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [58, 1550000.0, 2325000.0, 2790000.0, 3100000.0], [59, 1550000.0, 2325000.0, 2790000.0, 3100000.0]]; // [fromLevel,verde,azul,roxo,laranja]
  var SUP_HEROI_EXP = [100, 400, 1000, 1900, 3100, 4700, 6800, 9800, 14800, 20000, 25000, 30000, 35000, 40000, 46000, 53000, 61000, 70000, 80000, 90000, 100000, 110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 194000, 212000, 234000, 260000, 290000, 324000, 362000, 404000, 450000, 500000, 580000, 700000, 860000, 1060000, 1300000, 1580000, 1900000, 2260000, 2660000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000, 3100000]; // custo por nivel (indice 0 = custo p/ chegar no nivel 2)
  var SUP_HEROI_CLASSIF = [[500, 3], [1500, 9], [5000, 31], [24000, 150], [60000, 375]]; // [fragmentos,estrelas] por classificacao 2..6
  var SUP_HEROI_TRANSC = [[90, 50], [120, 90], [150, 150], [200, 220]]; // [fragmentos,nucleos] por nivel 1..4
  var SUP_HEROI_FRAGLEND = [["2-1-1-1", 10, 10], ["3-1-1-1", 10, 20], ["4-1-1-1", 15, 35], ["5-1-1-1", 15, 50], ["5-2-1-1", 25, 75], ["5-3-1-1", 30, 105], ["5-4-1-1", 35, 140], ["5-5-1-1", 40, 180], ["5-5-2-1", 40, 220], ["5-5-3-1", 45, 265], ["5-5-4-1", 50, 315], ["5-5-5-1", 55, 370], ["5-5-5-2", 70, 440], ["5-5-5-3", 75, 515], ["5-5-5-4", 80, 595], ["5-5-5-5", 85, 680]]; // [combo,custo,total]

  function supAcel(pts){
    return ['Gerais','Construção','Pesquisa','Treinamento','Cura','Desenvolvimento'].map(function(l){ return {label:l, pts:pts}; });
  }
  var SUP_OUTROS_EVENTO = [
    {label:'Confronto Aquático', pts:2000},
    {label:'Campo de Recompensa', pts:5000},
    {label:'Arquivos Primoroso Usados', pts:10800}
  ];
  var SUP_LIVRINHOS = [
    {exp:100, label:'100 XP'}, {exp:500, label:'500 XP'}, {exp:1000, label:'1.000 XP'},
    {exp:5000, label:'5.000 XP'}, {exp:10000, label:'10.000 XP'}, {exp:20000, label:'20.000 XP'}, {exp:50000, label:'50.000 XP'}
  ];
  var SUP_D2_OUTROS = [
    {label:'Busca Delegacia Normal', pts:1000},
    {label:'Busca Delegacia Avançada', pts:8000},
    {label:'Núcleos de Energia', pts:15000},
    {label:'Vigor Terras Desoladas FREE', pts:5500},
    {label:'Vigor Terras Desoladas Pote', pts:5500},
    {label:'Girar Roleta da Sorte', pts:132000},
    {label:'Confronto Aquático', pts:2000},
    {label:'Campo de Recompensa', pts:5000},
    {label:'Arquivos Primoroso Usados', pts:10800}
  ];
  var SUP_FRAGMENTO_HEROI = [
    {label:'Fragmento Lendário', pts:10000},
    {label:'Fragmento Épico', pts:2000}
  ];
  var SUP_EMBLEMAS_HEROI = [
    {label:'Lendário G', pts:20000}, {label:'Lendário M', pts:8000}, {label:'Lendário P', pts:2000},
    {label:'Elite G', pts:3000}, {label:'Elite M', pts:1200}, {label:'Elite P', pts:300}
  ];
  var SUP_TREINO_TROPA = [
    {label:'Nível 1', pts:5}, {label:'Nível 2', pts:10}, {label:'Nível 3', pts:20},
    {label:'Nível 4', pts:40}, {label:'Nível 5', pts:80}, {label:'Nível 6', pts:150}
  ];
  var SUP_EVOLUCAO_TROPA = [
    {label:'Evoluir T1 → T2', pts:145}, {label:'Evoluir T2 → T3', pts:140}, {label:'Evoluir T3 → T4', pts:130},
    {label:'Evoluir T4 → T5', pts:110}, {label:'Evoluir T5 → T6', pts:70}
  ];
  var SUP_D3_OUTROS = [
    {label:'Vigor Terras Desoladas FREE', pts:5500}, {label:'Vigor Terras Desoladas Pote', pts:5500},
    {label:'Girar Roleta da Sorte', pts:132000}, {label:'Confronto Aquático', pts:2000},
    {label:'Campo de Recompensa', pts:5000}, {label:'Arquivos Primoroso Usados', pts:10800}
  ];
  var SUP_D4_OUTROS = [
    {label:'Bilhetes Mágicos', pts:12700}, {label:'Flechas', pts:15000}
  ];
  // Oficina T3 (Dia 4): labels = niveis 0..25+Max, costs = 26 transicoes reais (a primeira, Nv.0>1, ja tem custo de material mas sem ganho de poder registrado)
  var SUP_OFICINA_T3_LABELS = ['Nv. 0','Nv. 1','Nv. 2','Nv. 3','Nv. 4','Nv. 5','Nv. 6','Nv. 7','Nv. 8','Nv. 9','Nv. 10','Nv. 11','Nv. 12','Nv. 13','Nv. 14','Nv. 15','Nv. 16','Nv. 17','Nv. 18','Nv. 19','Nv. 20','Nv. 21','Nv. 22','Nv. 23','Nv. 24','Nv. 25','Nv. Max'];
  var SUP_OFICINA_T3_COSTS = [
    {metal:660,aco:18,projeto:100,ganho:0,pontos:0},
    {metal:6880,aco:221,projeto:10,ganho:40800,pontos:6120000},
    {metal:7445,aco:259,projeto:10,ganho:45900,pontos:6885000},
    {metal:8340,aco:286,projeto:10,ganho:51000,pontos:7650000},
    {metal:9355,aco:322,projeto:15,ganho:57200,pontos:8580000},
    {metal:11105,aco:377,projeto:15,ganho:65500,pontos:9825000},
    {metal:11750,aco:405,projeto:15,ganho:72500,pontos:10875000},
    {metal:13155,aco:451,projeto:20,ganho:81000,pontos:12150000},
    {metal:14740,aco:507,projeto:20,ganho:91000,pontos:13650000},
    {metal:16515,aco:564,projeto:20,ganho:101500,pontos:15225000},
    {metal:18500,aco:634,projeto:25,ganho:114000,pontos:17100000},
    {metal:20655,aco:711,projeto:25,ganho:127500,pontos:19125000},
    {metal:23170,aco:793,projeto:25,ganho:142000,pontos:21300000},
    {metal:25925,aco:889,projeto:30,ganho:159500,pontos:23925000},
    {metal:28327,aco:996,projeto:30,ganho:178000,pontos:26700000},
    {metal:26555,aco:1032,projeto:30,ganho:174500,pontos:26175000},
    {metal:32020,aco:1164,projeto:60,ganho:230000,pontos:34500000},
    {metal:37995,aco:1312,projeto:90,ganho:250000,pontos:37500000},
    {metal:44630,aco:1493,projeto:120,ganho:290000,pontos:43500000},
    {metal:52285,aco:1714,projeto:150,ganho:330000,pontos:49500000},
    {metal:60545,aco:1980,projeto:190,ganho:390000,pontos:58500000},
    {metal:70130,aco:2297,projeto:230,ganho:450000,pontos:67500000},
    {metal:81090,aco:2660,projeto:270,ganho:510000,pontos:76500000},
    {metal:94075,aco:3079,projeto:310,ganho:590000,pontos:88500000},
    {metal:108950,aco:3567,projeto:360,ganho:670000,pontos:100500000},
    {metal:126185,aco:4131,projeto:420,ganho:780000,pontos:117000000}
  ];
  // Oficina T3 (Dia 4 / Utilitários): tabela de referência da planilha (Metal Premium / Aço Alto Carbono / Projeto T3 / Ganho de Poder)
  var SUP_OFICINA_T3_REF = [
    ['Lvl 0 > 1', 660, 18, 100, 348100],
    ['Lvl 1 > 2', 6880, 221, 10, 388900],
    ['Lvl 2 > 3', 7445, 259, 10, 434800],
    ['Lvl 3 > 4', 8340, 286, 10, 485800],
    ['Lvl 4 > 5', 9355, 322, 15, 543000],
    ['Lvl 5 > 6', 11105, 377, 15, 608500],
    ['Lvl 6 > 7', 11750, 405, 15, 681000],
    ['Lvl 7 > 8', 13155, 451, 20, 762000],
    ['Lvl 8 > 9', 14740, 507, 20, 853000],
    ['Lvl 9 > 10', 16515, 564, 20, 954500],
    ['Lvl 10 > 11', 18500, 634, 25, 1068500],
    ['Lvl 11 > 12', 20655, 711, 25, 1196000],
    ['Lvl 12 > 13', 23170, 793, 25, 1338000],
    ['Lvl 13 > 14', 25925, 889, 30, 1497500],
    ['Lvl 14 > 15', 28327, 996, 30, 1675500],
    ['Lvl 15 > 16', 26555, 1032, 30, 1850000],
    ['Lvl 16 > 17', 32020, 1164, 60, 2080000],
    ['Lvl 17 > 18', 37995, 1312, 90, 2330000],
    ['Lvl 18 > 19', 44630, 1493, 120, 2620000],
    ['Lvl 19 > 20', 52285, 1714, 150, 2950000],
    ['Lvl 20 > 21', 60545, 1980, 190, 3340000],
    ['Lvl 21 > 22', 70130, 2297, 230, 3790000],
    ['Lvl 22 > 23', 81090, 2660, 270, 4300000],
    ['Lvl 23 > 24', 94075, 3079, 310, 4890000],
    ['Lvl 24 > 25', 108950, 3567, 360, 5560000],
    ['Lvl 25 > Max', 126185, 4131, 420, 6340000]
  ];
  // Equipamento (Dia 5 / Comandante): "Nenhum" + 18 tiers reais
  var SUP_EQUIP_LABELS = ['Nenhum','Básico','Básico 1','Comum','Comum 1','Comum 2','Premium','Premium 1','Premium 2','Premium 3','Elite','Elite 1','Elite 2','Elite 3','Lendário','Lendário 1','Lendário 2','Lendário 3','Supremo'];
  var SUP_EQUIP_COSTS = [
    {tecido:80,aco:0,pontos:16000,poder:900},
    {tecido:100,aco:5,pontos:30000,poder:1600},
    {tecido:200,aco:15,pontos:70000,poder:3100},
    {tecido:300,aco:30,pontos:120000,poder:6600},
    {tecido:500,aco:45,pontos:190000,poder:12400},
    {tecido:800,aco:60,pontos:280000,poder:23800},
    {tecido:1100,aco:100,pontos:420000,poder:43600},
    {tecido:1400,aco:150,pontos:580000,poder:72000},
    {tecido:1700,aco:200,pontos:740000,poder:114500},
    {tecido:2000,aco:250,pontos:900000,poder:171100},
    {tecido:2500,aco:300,pontos:1100000,poder:256000},
    {tecido:3500,aco:350,pontos:1400000,poder:369100},
    {tecido:4500,aco:450,pontos:1800000,poder:510500},
    {tecido:5500,aco:550,pontos:2200000,poder:680200},
    {tecido:6000,aco:600,pontos:2400000,poder:864000},
    {tecido:6500,aco:650,pontos:2600000,poder:1047800},
    {tecido:6500,aco:650,pontos:2600000,poder:1231600},
    {tecido:7000,aco:700,pontos:2800000,poder:1415300}
  ];
  var SUP_PECAS_TIERS = [
    {label:'Básico', pts:42000}, {label:'Gerais', pts:108000}, {label:'Premium', pts:324000},
    {label:'Elite', pts:1296000}, {label:'Lendário', pts:4860000}, {label:'Supreme', pts:20412000}, {label:'Excellent', pts:32076000}
  ];
  var SUP_MOCHILA_TIERS = [
    {label:'Básico', pts:84000}, {label:'Gerais', pts:216000}, {label:'Premium', pts:648000},
    {label:'Elite', pts:2592000}, {label:'Lendário', pts:9720000}, {label:'Supreme', pts:40824000}, {label:'Excellent', pts:64152000}
  ];

  // ================= SUPREMO: componentes reutilizáveis =================
  function supFmt(n){ return fmtInt(Math.round(n || 0)); }

  function supQtyBlock(container, title, note, items){
    var wrap = document.createElement('div');
    wrap.className = 'sup-section';
    var rows = items.map(function(it, i){
      return '<tr><td>' + escapeHtml(it.label) + '</td>' +
        '<td class="num"><input type="number" min="0" value="0" class="sup-input" data-i="' + i + '"></td>' +
        '<td class="num">' + supFmt(it.pts) + '</td>' +
        '<td class="num sup-line" data-i="' + i + '">0</td></tr>';
    }).join('');
    wrap.innerHTML =
      '<div class="sup-section-title">' + escapeHtml(title) + '</div>' +
      (note ? '<div class="sup-section-note">' + escapeHtml(note) + '</div>' : '') +
      '<div class="rank-table-wrap"><table class="sup-table rank-table"><thead><tr><th>Item</th><th class="num">Quantidade</th><th class="num">Pontos/un.</th><th class="num">Total</th></tr></thead><tbody>' +
      rows + '</tbody><tfoot><tr><td colspan="3">Subtotal</td><td class="num sup-subtotal">0</td></tr></tfoot></table></div>';
    container.appendChild(wrap);
    var inputs = wrap.querySelectorAll('.sup-input');
    var subtotalEl = wrap.querySelector('.sup-subtotal');
    function getTotal(){
      var total = 0;
      inputs.forEach(function(inp, i){
        var qty = parseFloat(inp.value) || 0;
        var line = qty * items[i].pts;
        total += line;
        wrap.querySelector('.sup-line[data-i="' + i + '"]').textContent = supFmt(line);
      });
      subtotalEl.textContent = supFmt(total);
      return total;
    }
    getTotal();
    return { getTotal: getTotal };
  }

  function supLivrinhosBlock(container, title, items){
    var wrap = document.createElement('div');
    wrap.className = 'sup-section';
    var rows = items.map(function(it, i){
      return '<tr><td>' + escapeHtml(it.label) + '</td>' +
        '<td class="num"><input type="number" min="0" value="0" class="sup-input" data-i="' + i + '"></td>' +
        '<td class="num sup-exp" data-i="' + i + '">0</td>' +
        '<td class="num sup-line" data-i="' + i + '">0</td></tr>';
    }).join('');
    wrap.innerHTML =
      '<div class="sup-section-title">' + escapeHtml(title) + '</div>' +
      '<div class="sup-section-note">Pontuação = EXP total ÷ 50.</div>' +
      '<div class="rank-table-wrap"><table class="sup-table rank-table"><thead><tr><th>Livrinho</th><th class="num">Quantidade</th><th class="num">EXP total</th><th class="num">Pontos</th></tr></thead><tbody>' +
      rows + '</tbody><tfoot><tr><td colspan="3">Subtotal</td><td class="num sup-subtotal">0</td></tr></tfoot></table></div>';
    container.appendChild(wrap);
    var inputs = wrap.querySelectorAll('.sup-input');
    var subtotalEl = wrap.querySelector('.sup-subtotal');
    function getTotal(){
      var total = 0;
      inputs.forEach(function(inp, i){
        var qty = parseFloat(inp.value) || 0;
        var exp = qty * items[i].exp;
        var pts = exp / 50;
        total += pts;
        wrap.querySelector('.sup-exp[data-i="' + i + '"]').textContent = supFmt(exp);
        wrap.querySelector('.sup-line[data-i="' + i + '"]').textContent = supFmt(pts);
      });
      subtotalEl.textContent = supFmt(total);
      return total;
    }
    getTotal();
    return { getTotal: getTotal };
  }

  // labels.length = costs.length + 1. costs[i] = custo para avançar de labels[i] para labels[i+1].
  function supLadderBlock(container, opts){
    var wrap = document.createElement('div');
    wrap.className = 'sup-section';
    var uid = 'lad' + Math.floor(Math.random() * 1e9);
    var optHtml = opts.labels.map(function(l, i){ return '<option value="' + i + '">' + escapeHtml(l) + '</option>'; }).join('');
    wrap.innerHTML =
      '<div class="sup-section-title">' + escapeHtml(opts.title) + '</div>' +
      (opts.note ? '<div class="sup-section-note">' + escapeHtml(opts.note) + '</div>' : '') +
      '<div class="sup-range-row">' +
        '<div class="sup-range-field"><label>De</label><select class="sup-select" id="' + uid + '-atual">' + optHtml + '</select></div>' +
        '<div class="sup-range-field"><label>Até</label><select class="sup-select" id="' + uid + '-alvo">' + optHtml + '</select></div>' +
      '</div>' +
      '<div class="sup-range-result" id="' + uid + '-result"></div>';
    container.appendChild(wrap);
    var atualSel = wrap.querySelector('#' + uid + '-atual');
    var alvoSel = wrap.querySelector('#' + uid + '-alvo');
    var resultEl = wrap.querySelector('#' + uid + '-result');
    atualSel.value = 0;
    alvoSel.value = 0;

    function compute(){
      var a = parseInt(atualSel.value, 10), b = parseInt(alvoSel.value, 10);
      if (b < a) b = a;
      var sums = {};
      opts.fields.forEach(function(f){ sums[f.key] = 0; });
      for (var i = a; i < b; i++){
        var c = opts.costs[i];
        if (!c) continue;
        opts.fields.forEach(function(f){ sums[f.key] += (c[f.key] || 0) * (opts.multiplier ? opts.multiplier() : 1); });
      }
      resultEl.innerHTML = opts.fields.map(function(f){
        return '<div class="stat' + (f.highlight ? ' hl' : '') + '"><div class="n">' + supFmt(sums[f.key]) + '</div><div class="l">' + escapeHtml(f.label) + '</div></div>';
      }).join('');
      return sums;
    }
    atualSel.addEventListener('change', compute);
    alvoSel.addEventListener('change', compute);
    compute();
    return { compute: compute, atualSel: atualSel, alvoSel: alvoSel };
  }

  function supTotalBanner(container, label, id){
    var el = document.createElement('div');
    el.className = 'sup-total-banner';
    el.innerHTML = '<div><div class="l">' + escapeHtml(label) + '</div><div class="n" id="' + id + '">0</div></div>';
    container.appendChild(el);
  }

  // ================= SUPREMO: montagem principal =================
  function buildSupremo(){
    var SUP_TOTALS = { dia1: 0, dia2: 0, dia3: 0, dia4: 0, dia5: 0, dia6: 0 };

    function updateResumo(){
      var grand = 0;
      ['dia1', 'dia2', 'dia3', 'dia4', 'dia5', 'dia6'].forEach(function(k){
        grand += SUP_TOTALS[k];
        var el = document.getElementById('sup-resumo-' + k);
        if (el) el.textContent = supFmt(SUP_TOTALS[k]);
      });
      var totalEl = document.getElementById('sup-resumo-total');
      if (totalEl) totalEl.textContent = supFmt(grand);
    }

    // ---- Resumo ----
    var resumoPanel = document.getElementById('sup-panel-resumo');
    resumoPanel.innerHTML =
      '<p class="sup-intro">Preencha as abas de Dia 1 a Dia 6 com as quantidades que você fez (ou pretende fazer) em cada categoria do evento Supremo. O resumo abaixo se atualiza sozinho.</p>' +
      '<div class="sup-summary-grid">' +
      ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5', 'Dia 6'].map(function(l, i){
        return '<div class="stat"><div class="n" id="sup-resumo-dia' + (i + 1) + '">0</div><div class="l">' + l + '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="sup-total-banner"><div><div class="l">Total estimado do evento</div><div class="n" id="sup-resumo-total">0</div></div></div>';

    // ---- Dia 1: Acelerações ----
    var p1 = document.getElementById('sup-panel-dia1');
    p1.innerHTML = '<p class="sup-intro">Aceleradores usados no Dia 1 valem 250 pontos por minuto (limite de 100M de pontos nessa categoria, definido pelo próprio evento).</p>';
    var d1a = supQtyBlock(p1, 'Aceleradores (250 pts/min)', null, supAcel(250));
    var d1b = supQtyBlock(p1, 'Outros', null, SUP_OUTROS_EVENTO);
    supTotalBanner(p1, 'Total do Dia 1', 'sup-dia1-total');
    function recomputeDia1(){
      SUP_TOTALS.dia1 = d1a.getTotal() + d1b.getTotal();
      document.getElementById('sup-dia1-total').textContent = supFmt(SUP_TOTALS.dia1);
      updateResumo();
    }
    p1.addEventListener('input', recomputeDia1);
    recomputeDia1();

    // ---- Dia 2: Heróis ----
    var p2 = document.getElementById('sup-panel-dia2');
    p2.innerHTML = '<p class="sup-intro">Livrinhos de EXP, buscas, vigor e itens de herói.</p>';
    var d2a = supLivrinhosBlock(p2, 'Livrinhos de EXP', SUP_LIVRINHOS);
    var d2b = supQtyBlock(p2, 'Outros', null, SUP_D2_OUTROS);
    var d2c = supQtyBlock(p2, 'Fragmento de Herói', null, SUP_FRAGMENTO_HEROI);
    var d2d = supQtyBlock(p2, 'Emblemas de Herói', null, SUP_EMBLEMAS_HEROI);
    supTotalBanner(p2, 'Total do Dia 2', 'sup-dia2-total');
    function recomputeDia2(){
      SUP_TOTALS.dia2 = d2a.getTotal() + d2b.getTotal() + d2c.getTotal() + d2d.getTotal();
      document.getElementById('sup-dia2-total').textContent = supFmt(SUP_TOTALS.dia2);
      updateResumo();
    }
    p2.addEventListener('input', recomputeDia2);
    recomputeDia2();

    // ---- Dia 3: Tropas ----
    var p3 = document.getElementById('sup-panel-dia3');
    p3.innerHTML = '<p class="sup-intro">Treinamento e evolução de tropas, além dos itens comuns do evento.</p>';
    var d3a = supQtyBlock(p3, 'Treinamento de Tropas', null, SUP_TREINO_TROPA);
    var d3b = supQtyBlock(p3, 'Evolução de Tropas', 'Quantidade de tropas evoluídas para o próximo tier.', SUP_EVOLUCAO_TROPA);
    var d3c = supQtyBlock(p3, 'Outros', null, SUP_D3_OUTROS);
    supTotalBanner(p3, 'Total do Dia 3', 'sup-dia3-total');
    function recomputeDia3(){
      SUP_TOTALS.dia3 = d3a.getTotal() + d3b.getTotal() + d3c.getTotal();
      document.getElementById('sup-dia3-total').textContent = supFmt(SUP_TOTALS.dia3);
      updateResumo();
    }
    p3.addEventListener('input', recomputeDia3);
    recomputeDia3();

    // ---- Dia 4: Oficina ----
    var p4 = document.getElementById('sup-panel-dia4');
    p4.innerHTML = '<p class="sup-intro">Selecione o nível atual e o nível que pretende alcançar na Oficina T3 nesse dia.</p>';
    var d4a = supLadderBlock(p4, {
      title: 'Oficina T3',
      labels: SUP_OFICINA_T3_LABELS,
      costs: SUP_OFICINA_T3_COSTS,
      fields: [
        { key: 'metal', label: 'Metal Premium' },
        { key: 'aco', label: 'Aço Alto Carbono' },
        { key: 'projeto', label: 'Projeto T3' },
        { key: 'ganho', label: 'Ganho de Poder' },
        { key: 'pontos', label: 'Pontos', highlight: true }
      ]
    });
    var p4outros = document.createElement('div');
    p4.appendChild(p4outros);
    var d4b = supQtyBlock(p4outros, 'Outros', null, SUP_D4_OUTROS);
    supTotalBanner(p4, 'Total do Dia 4', 'sup-dia4-total');
    function recomputeDia4(){
      var s = d4a.compute();
      SUP_TOTALS.dia4 = (s.pontos || 0) + d4b.getTotal();
      document.getElementById('sup-dia4-total').textContent = supFmt(SUP_TOTALS.dia4);
      updateResumo();
    }
    p4.addEventListener('input', recomputeDia4);
    p4.addEventListener('change', recomputeDia4);
    recomputeDia4();

    // ---- Dia 5: Equipamento ----
    var p5 = document.getElementById('sup-panel-dia5');
    p5.innerHTML = '<p class="sup-intro">Equipamento do comandante, peças e mochila, além dos itens comuns do evento.</p>';
    var d5a = supQtyBlock(p5, 'Outros', null, [
      { label: 'Rastrear Armamento', pts: 5500 },
      { label: 'Melhoria Incomum (chip azul)', pts: 1500 },
      { label: 'Chips de Melhoria Elite (chip rosa)', pts: 38000 }
    ]);
    var d5b = supLadderBlock(p5, {
      title: 'Equipamento do Comandante',
      labels: SUP_EQUIP_LABELS,
      costs: SUP_EQUIP_COSTS,
      fields: [
        { key: 'tecido', label: 'Tecido' },
        { key: 'aco', label: 'Aço' },
        { key: 'pontos', label: 'Pontos', highlight: true },
        { key: 'poder', label: 'Poder' }
      ]
    });
    var d5c = supQtyBlock(p5, 'Peças (Capacete / Arma / Armadura / Faca / Inferiores / Botas)', 'Quantidade de peças concluídas em cada tier.', SUP_PECAS_TIERS);
    var d5d = supQtyBlock(p5, 'Mochila', 'Quantidade de mochilas concluídas em cada tier.', SUP_MOCHILA_TIERS);
    supTotalBanner(p5, 'Total do Dia 5', 'sup-dia5-total');
    function recomputeDia5(){
      var s = d5b.compute();
      SUP_TOTALS.dia5 = d5a.getTotal() + (s.pontos || 0) + d5c.getTotal() + d5d.getTotal();
      document.getElementById('sup-dia5-total').textContent = supFmt(SUP_TOTALS.dia5);
      updateResumo();
    }
    p5.addEventListener('input', recomputeDia5);
    p5.addEventListener('change', recomputeDia5);
    recomputeDia5();

    // ---- Dia 6: Geral ----
    var p6 = document.getElementById('sup-panel-dia6');
    p6.innerHTML = '<p class="sup-intro">Aceleradores usados no Dia 6 valem 200 pontos por minuto.</p>';
    var d6a = supQtyBlock(p6, 'Aceleradores (200 pts/min)', null, supAcel(200));
    supTotalBanner(p6, 'Total do Dia 6', 'sup-dia6-total');
    function recomputeDia6(){
      SUP_TOTALS.dia6 = d6a.getTotal();
      document.getElementById('sup-dia6-total').textContent = supFmt(SUP_TOTALS.dia6);
      updateResumo();
    }
    p6.addEventListener('input', recomputeDia6);
    recomputeDia6();

    // ---- Herói ----
    var ph = document.getElementById('sup-panel-heroi');
    ph.innerHTML = '<p class="sup-intro">Planeje a evolução dos seus heróis: EXP para subir de nível e transcendência.</p>';
    var heroiExpLabels = [];
    for (var hl = 1; hl <= 60; hl++) heroiExpLabels.push('Nível ' + hl);
    var heroiExpCosts = SUP_HEROI_EXP.map(function(v){ return { exp: v }; });
    supLadderBlock(ph, {
      title: 'EXP do Herói',
      labels: heroiExpLabels,
      costs: heroiExpCosts,
      fields: [{ key: 'exp', label: 'EXP necessária', highlight: true }]
    });
    var transcLabels = ['Nível 0', 'Nível 1', 'Nível 2', 'Nível 3', 'Nível 4'];
    var transcCosts = SUP_HEROI_TRANSC.map(function(v){ return { fragmentos: v[0], nucleos: v[1] }; });
    supLadderBlock(ph, {
      title: 'Transcendência',
      labels: transcLabels,
      costs: transcCosts,
      fields: [{ key: 'fragmentos', label: 'Fragmentos', highlight: true }, { key: 'nucleos', label: 'Núcleos de Energia' }]
    });
    var fragRefWrap = document.createElement('div');
    fragRefWrap.className = 'sup-section';
    fragRefWrap.innerHTML =
      '<div class="sup-section-title">Fragmentos de Herói Lendário por combinação de estrelas</div>' +
      '<div class="rank-table-wrap"><table class="sup-table rank-table"><thead><tr><th>Combinação</th><th class="num">Custo</th><th class="num">Custo total</th></tr></thead><tbody>' +
      SUP_HEROI_FRAGLEND.map(function(row){
        return '<tr><td>' + escapeHtml(row[0]) + '</td><td class="num">' + supFmt(row[1]) + '</td><td class="num">' + supFmt(row[2]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="sup-ref-note">Tabela de referência da planilha da aliança — não soma automaticamente, é só consulta.</p>';
    ph.appendChild(fragRefWrap);

    // ---- Oficina (tabela de referência Oficina T3) ----
    var po = document.getElementById('sup-panel-oficina');
    po.innerHTML = '<p class="sup-intro">Tabela de referência da Oficina T3, direto da planilha da aliança.</p>';
    var oficinaT3Wrap = document.createElement('div');
    oficinaT3Wrap.className = 'sup-section';
    oficinaT3Wrap.innerHTML =
      '<div class="sup-section-title">Oficina T3</div>' +
      '<div class="rank-table-wrap"><table class="sup-table rank-table"><thead><tr><th>Nível</th><th class="num">Metal Premium</th><th class="num">Aço Alto Carbono</th><th class="num">Projeto T3</th><th class="num">Ganho de Poder</th></tr></thead><tbody>' +
      SUP_OFICINA_T3_REF.map(function(row){
        return '<tr><td>' + escapeHtml(row[0]) + '</td><td class="num">' + supFmt(row[1]) + '</td><td class="num">' + supFmt(row[2]) + '</td><td class="num">' + supFmt(row[3]) + '</td><td class="num">' + supFmt(row[4]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="sup-ref-note">Tabela de referência da planilha da aliança — não soma automaticamente, é só consulta.</p>';
    po.appendChild(oficinaT3Wrap);

    // ---- XP Heróis (por raridade) ----
    var px = document.getElementById('sup-panel-xpherois');
    px.innerHTML = '<p class="sup-intro">Escolha a raridade do herói, quantos heróis estão passando por esse intervalo de níveis, e veja o total de XP necessário.</p>';
    var raridades = [
      { key: 1, label: 'Verde' }, { key: 2, label: 'Azul' }, { key: 3, label: 'Roxo' }, { key: 4, label: 'Laranja' }
    ];
    var xpQtyWrap = document.createElement('div');
    xpQtyWrap.className = 'sup-section';
    xpQtyWrap.innerHTML =
      '<div class="sup-range-row">' +
      '<div class="sup-range-field"><label>Raridade</label><select class="sup-select" id="sup-xp-raridade">' +
      raridades.map(function(r){ return '<option value="' + r.key + '">' + r.label + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="sup-range-field"><label>Quantidade de heróis</label><input type="number" min="0" value="1" class="sup-input" id="sup-xp-qtd" style="width:100px"></div>' +
      '</div>';
    px.appendChild(xpQtyWrap);
    var xpLadderContainer = document.createElement('div');
    px.appendChild(xpLadderContainer);
    var xpLevelLabels = [];
    for (var xl = 1; xl <= 60; xl++) xpLevelLabels.push('Nível ' + xl);
    var xpLadder = null;
    function buildXpLadder(){
      xpLadderContainer.innerHTML = '';
      var raridadeIdx = parseInt(document.getElementById('sup-xp-raridade').value, 10);
      var qtdInput = document.getElementById('sup-xp-qtd');
      var costs = SUP_XP_HEROIS_RAW.map(function(row){ return { xp: row[raridadeIdx] }; });
      xpLadder = supLadderBlock(xpLadderContainer, {
        title: 'XP necessária',
        labels: xpLevelLabels,
        costs: costs,
        fields: [{ key: 'xp', label: 'XP total', highlight: true }],
        multiplier: function(){ return parseFloat(qtdInput.value) || 0; }
      });
    }
    document.getElementById('sup-xp-raridade').addEventListener('change', buildXpLadder);
    px.addEventListener('input', function(e){ if (e.target.id === 'sup-xp-qtd' && xpLadder) xpLadder.compute(); });
    buildXpLadder();
  }

  buildSupremo();

  function fmtInt(n){return Math.round(n).toLocaleString('pt-BR');}
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
})();
