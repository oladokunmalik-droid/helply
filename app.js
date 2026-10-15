/* ============ CONFIG ============ */
// Paste a NewsAPI.org key here to pull live local headlines. Leave empty to use sample headlines.
// (NewsAPI blocks browser calls on its free plan outside localhost, so production should proxy through your server.)
const NEWS_API_KEY = "";

// Formspree collects sign-ups, event registrations, check-ins, raffle entries and safety reports.
// Set to "" to turn all submissions off.
const FORMSPREE_URL = "https://formspree.io/f/mzedyeze";

// Optional: URL of your own server endpoint that calls an AI model for the Tidy bot.
// Never put an AI API key in this file, because GitHub Pages serves it to everyone.
// The endpoint receives { event, messages } and should answer { reply }. Leave "" to use built-in answers.
const TIDY_ENDPOINT = "";

async function sendToFormspree(kind, fields){
  if(!FORMSPREE_URL) return true;
  try{
    const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),10000);
    const r=await fetch(FORMSPREE_URL,{method:"POST",signal:ctl.signal,
      headers:{"Accept":"application/json","Content-Type":"application/json"},
      body:JSON.stringify({_subject:"Helply: "+kind.replace(/_/g," "),form_type:kind,submitted_at:new Date().toISOString(),_gotcha:"",...fields})});
    clearTimeout(to);
    if(!r.ok) throw new Error("Formspree responded "+r.status);
    return true;
  }catch(err){ console.warn("Formspree submit failed:",err); return false; }
}
// Sends in the background so the app never waits on the network.
function track(kind,fields){
  if(state.user&&state.user.demo) return; // demo activity is never submitted
  sendToFormspree(kind,fields).then(ok=>{ if(!ok) toast("We couldn't reach Helply's server. Check your connection."); });
}
const RAFFLE_MIN_HOURS = 20, HOURS_GOAL = 150;

/* ============ DATA ============ */
const CAUSES = {Environment:"#2F9E6E", Hunger:"#E08A00", Education:"#4B7BEC", Seniors:"#C2559B"};
const EVENTS = [
 {id:"c1",city:"Chicago",title:"Neighborhood Cleanup",org:"Boys & Girls Club of America",cause:"Environment",date:"2026-12-01",time:"4:00–7:00 PM",hours:3,where:"Eastside Clubhouse, meet at the front lot",spots:24,about:"We need volunteers to clear litter from the blocks around the club. Gloves, bags and grabbers are provided. Bring water and wear closed-toe shoes."},
 {id:"c2",city:"Chicago",title:"Holiday Food Pantry Sort",org:"Westside Food Pantry",cause:"Hunger",date:"2026-10-24",time:"9:00 AM–12:00 PM",hours:3,where:"Westside Pantry warehouse, Door B",spots:12,about:"Sort and box donated groceries for neighbors ahead of the holidays. Light lifting involved."},
 {id:"c3",city:"Chicago",title:"Reading Buddies",org:"Pageturners Literacy Project",cause:"Education",date:"2026-11-07",time:"10:00 AM–12:00 PM",hours:2,where:"Branch library, children's room",spots:8,about:"Pair up with a grade-schooler and read together. No experience needed. We'll show you how at a 15-minute welcome."},
 {id:"a1",city:"Austin",title:"Creek Bank Cleanup",org:"Creekside Stewards",cause:"Environment",date:"2026-11-14",time:"8:00–11:00 AM",hours:3,where:"Trailhead lot, east entrance",spots:30,about:"Clear storm debris and trash along the creek. Waders and gloves available on site."},
 {id:"a2",city:"Austin",title:"Tech Help for Seniors",org:"Silver Connect",cause:"Seniors",date:"2026-11-21",time:"1:00–3:00 PM",hours:2,where:"Community center, Room 4",spots:10,about:"Help neighbors set up video calls, email and appointment portals, one-on-one."},
 {id:"a3",city:"Austin",title:"Community Garden Build",org:"Green Plot Collective",cause:"Environment",date:"2026-12-05",time:"9:00 AM–1:00 PM",hours:4,where:"Maple Street lot",spots:18,about:"Build raised beds and fill them with soil for a new neighborhood garden."},
 {id:"g1",city:"Atlanta",title:"Holiday Meal Packing",org:"Hope Kitchen Network",cause:"Hunger",date:"2026-10-31",time:"10:00 AM–1:00 PM",hours:3,where:"Hope Kitchen, main hall",spots:40,about:"Assemble meal kits on a packing line. Hairnets and gloves provided."},
 {id:"g2",city:"Atlanta",title:"Homework Help Night",org:"Study Bridge",cause:"Education",date:"2026-11-10",time:"5:30–7:30 PM",hours:2,where:"Study Bridge learning center",spots:14,about:"Tutor middle schoolers in math and reading. A short orientation is included."},
 {id:"g3",city:"Atlanta",title:"Trail Restoration Day",org:"Trailkeepers",cause:"Environment",date:"2026-12-12",time:"9:00 AM–12:00 PM",hours:3,where:"Park north gate",spots:22,about:"Repair storm-damaged trails and clear fallen branches. Tools are provided."}
];
const SAMPLE_NEWS = {
 Chicago:[{hl:"Litter builds up along neighborhood streets after a wet fall",src:"Sample headline",idea:"Join a neighborhood cleanup",ev:"c1"},{hl:"Pantries report rising demand ahead of the holidays",src:"Sample headline",idea:"Sort food boxes for neighbors",ev:"c2"}],
 Austin:[{hl:"Creek banks covered in debris after October storms",src:"Sample headline",idea:"Help clear the creek",ev:"a1"},{hl:"More services move online, leaving seniors behind",src:"Sample headline",idea:"Teach a senior to video call",ev:"a2"}],
 Atlanta:[{hl:"Food bank asks for volunteers as holiday demand climbs",src:"Sample headline",idea:"Pack holiday meals",ev:"g1"},{hl:"Storm damage closes sections of local trails",src:"Sample headline",idea:"Restore a park trail",ev:"g3"}]
};
const CREW = [{n:"Maya R.",h:"maya.serves",s:"Cleanup, Sep 12"},{n:"Devon T.",h:"devon.codes",s:"Food drive, Sep 26"},{n:"Priya S.",h:"priya_reads",s:"Book drive, Aug 29"}];
const initialLog = () => [
 {title:"Library book drive",date:"Aug 29",hours:6},
 {title:"Park garden day",date:"Sep 12",hours:5},
 {title:"Coat drive sorting",date:"Sep 26",hours:7}
];

const LOGO="assets/logo.png"; // relative path so it works on project pages (user.github.io/repo/)
const logoImg=(cls="")=>`<img class="logo-mark ${cls}" src="${LOGO}" alt="">`;
/* ============ LOCATION: ZIP -> nearest major city ============ */
// Median centre of every 3-digit ZIP prefix (lat,lon). Accurate to roughly the metro area, which is plenty for "nearest major city".
const ZIP3_RAW="005:40.82,-73.05|006:18.32,-66.89|007:18.15,-66.12|008:17.75,-64.79|009:18.43,-66.11|010:42.26,-72.61|011:42.12,-72.59|012:42.36,-73.23|013:42.60,-72.57|014:42.58,-71.75|015:42.20,-71.79|016:42.26,-71.80|017:42.38,-71.46|018:42.63,-71.16|019:42.60,-70.91|020:42.15,-71.14|021:42.35,-71.07|022:42.35,-71.06|023:42.03,-70.91|024:42.35,-71.21|025:41.62,-70.61|026:41.69,-70.16|027:41.73,-71.08|028:41.69,-71.54|029:41.82,-71.43|030:42.86,-71.47|031:42.99,-71.45|032:43.49,-71.65|033:43.25,-71.54|034:42.90,-72.20|035:44.40,-71.48|036:43.17,-72.36|037:43.64,-72.13|038:43.26,-71.05|039:43.17,-70.71|040:43.74,-70.55|041:43.66,-70.26|042:44.28,-70.32|043:44.31,-69.78|044:45.14,-68.73|045:43.91,-69.59|046:44.49,-68.13|047:46.76,-68.22|048:44.11,-69.11|049:44.70,-69.62|050:43.82,-72.38|051:43.27,-72.60|052:43.07,-73.16|053:42.94,-72.73|054:44.54,-73.08|055:42.65,-71.18|056:44.26,-72.58|057:43.64,-73.05|058:44.66,-72.11|059:44.98,-71.69|060:41.87,-72.78|061:41.79,-72.72|062:41.84,-72.09|063:41.47,-72.05|064:41.42,-72.80|065:41.31,-72.93|066:41.18,-73.20|067:41.59,-73.09|068:41.17,-73.42|069:41.05,-73.54|070:40.78,-74.25|071:40.74,-74.18|072:40.66,-74.22|073:40.73,-74.08|074:41.03,-74.27|075:40.92,-74.17|076:40.93,-74.03|077:40.31,-74.07|078:40.92,-74.75|079:40.73,-74.49|080:39.83,-75.02|081:39.93,-75.09|082:39.27,-74.70|083:39.45,-75.03|084:39.36,-74.45|085:40.30,-74.65|086:40.27,-74.71|087:39.98,-74.15|088:40.54,-74.56|089:40.48,-74.45|099:0.00,0.00|100:40.75,-73.99|101:40.76,-73.98|102:40.71,-74.01|103:40.60,-74.15|104:40.84,-73.88|105:41.21,-73.79|106:41.04,-73.76|107:40.95,-73.86|108:40.91,-73.79|109:41.27,-74.14|110:40.75,-73.69|111:40.75,-73.93|112:40.65,-73.95|113:40.75,-73.85|114:40.69,-73.80|115:40.71,-73.64|116:40.60,-73.82|117:40.79,-73.26|118:40.76,-73.52|119:40.93,-72.58|120:42.68,-73.91|121:42.64,-73.79|122:42.65,-73.76|123:42.81,-73.94|124:42.09,-74.17|125:41.67,-73.89|126:41.73,-73.80|127:41.69,-74.77|128:43.49,-73.70|129:44.62,-73.80|130:43.02,-76.18|131:43.06,-76.28|132:43.04,-76.15|133:43.04,-75.26|134:43.10,-75.31|135:43.10,-75.23|136:44.26,-75.60|137:42.26,-75.65|138:42.37,-75.54|139:42.12,-75.89|140:42.77,-78.63|141:42.75,-78.71|142:42.89,-78.87|143:43.09,-79.04|144:42.96,-77.66|145:42.98,-77.46|146:43.17,-77.63|147:42.19,-78.95|148:42.33,-77.03|149:42.09,-76.81|150:40.56,-80.02|151:40.40,-79.86|152:40.43,-80.02|153:40.03,-80.17|154:39.97,-79.81|155:39.99,-78.99|156:40.31,-79.56|157:40.70,-79.03|158:41.27,-78.70|159:40.36,-78.87|160:40.92,-79.90|161:41.14,-80.36|162:40.97,-79.36|163:41.59,-79.50|164:41.89,-80.10|165:42.13,-80.07|166:40.48,-78.37|167:41.82,-78.54|168:40.95,-78.01|169:41.84,-77.27|170:40.38,-77.00|171:40.27,-76.88|172:40.03,-77.74|173:39.88,-76.88|174:39.96,-76.71|175:40.05,-76.21|176:40.03,-76.30|177:41.25,-77.06|178:40.86,-76.82|179:40.70,-76.24|180:40.65,-75.48|181:40.60,-75.48|182:40.93,-75.97|183:41.09,-75.27|184:41.55,-75.41|185:41.41,-75.66|186:41.34,-76.05|187:41.27,-75.88|188:41.80,-76.09|189:40.34,-75.15|190:40.00,-75.28|191:40.00,-75.15|192:40.00,-75.12|193:39.95,-75.73|194:40.16,-75.41|195:40.42,-75.85|196:40.34,-75.94|197:39.59,-75.65|198:39.75,-75.55|199:38.89,-75.50|200:38.89,-77.01|201:38.96,-77.56|202:38.89,-77.01|203:38.89,-77.01|204:38.89,-77.01|205:38.89,-77.02|206:38.37,-76.73|207:38.89,-76.88|208:39.14,-77.15|209:38.99,-77.03|210:39.44,-76.59|211:39.42,-76.65|212:39.29,-76.62|214:38.98,-76.52|215:39.59,-78.94|216:38.94,-76.05|217:39.49,-77.50|218:38.32,-75.65|219:39.60,-75.94|220:38.86,-77.27|221:38.83,-77.26|222:38.88,-77.10|223:38.80,-77.08|224:38.18,-77.13|225:38.06,-76.91|226:39.04,-78.19|227:38.46,-78.15|228:38.56,-78.82|229:38.04,-78.56|230:37.56,-76.90|231:37.52,-76.94|232:37.52,-77.47|233:37.49,-75.89|234:37.00,-75.98|235:36.89,-76.26|236:37.08,-76.43|237:36.84,-76.35|238:37.01,-77.43|239:37.01,-78.45|240:37.27,-79.96|241:37.12,-80.07|242:36.82,-82.40|243:36.82,-81.11|244:38.10,-79.32|245:37.25,-79.16|246:37.20,-81.86|247:37.40,-81.24|248:37.45,-81.64|249:37.78,-80.46|250:38.17,-81.44|251:38.18,-81.45|252:38.71,-81.59|253:38.35,-81.63|254:39.38,-77.96|255:38.26,-82.15|256:37.77,-82.00|257:38.41,-82.28|258:37.76,-81.21|259:37.77,-81.08|260:40.18,-80.60|261:39.22,-81.32|262:38.79,-80.05|263:39.26,-80.44|264:39.28,-80.43|265:39.58,-80.14|266:38.40,-80.80|267:39.34,-78.89|268:38.99,-79.05|270:36.26,-80.39|271:36.07,-80.24|272:35.95,-79.71|273:35.95,-79.66|274:36.07,-79.79|275:35.81,-78.56|276:35.80,-78.63|277:36.03,-78.89|278:35.83,-77.42|279:36.23,-76.11|280:35.36,-81.09|281:35.28,-80.68|282:35.23,-80.82|283:35.02,-79.01|284:34.30,-78.11|285:35.02,-77.13|286:36.07,-81.37|287:35.42,-82.56|288:35.62,-82.53|289:35.04,-83.94|290:34.01,-80.81|291:33.90,-80.93|292:34.01,-80.99|293:34.93,-81.92|294:32.93,-80.02|295:34.06,-79.45|296:34.75,-82.49|297:34.89,-80.99|298:33.52,-81.80|299:32.54,-80.87|300:33.91,-84.18|301:34.07,-84.85|302:33.35,-84.44|303:33.80,-84.39|304:32.39,-82.11|305:34.50,-83.71|306:33.93,-83.30|307:34.79,-85.04|308:33.37,-82.38|309:33.46,-82.09|310:32.58,-83.51|311:33.80,-84.44|312:32.81,-83.66|313:31.87,-81.40|314:32.01,-81.09|315:31.31,-82.12|316:30.99,-83.23|317:31.54,-83.93|318:32.61,-84.74|319:32.49,-84.94|320:30.12,-82.04|321:29.24,-81.41|322:30.33,-81.65|323:30.44,-84.32|324:30.48,-85.60|325:30.45,-87.18|326:29.65,-82.37|327:28.74,-81.30|328:28.54,-81.34|329:28.05,-80.61|330:25.98,-80.28|331:25.77,-80.23|332:25.77,-80.19|333:26.12,-80.18|334:26.62,-80.11|335:28.01,-82.27|336:27.94,-82.44|337:27.89,-82.72|338:27.98,-81.73|339:26.64,-81.94|341:26.15,-81.73|342:27.34,-82.47|344:29.01,-82.33|346:28.27,-82.68|347:28.55,-81.63|349:27.29,-80.35|350:33.58,-86.75|351:33.51,-86.62|352:33.52,-86.81|354:33.21,-87.64|355:33.93,-87.62|356:34.70,-87.25|357:34.75,-86.39|358:34.73,-86.56|359:34.26,-85.96|360:32.16,-86.19|361:32.33,-86.24|362:33.65,-85.75|363:31.28,-85.54|364:31.42,-87.21|365:30.85,-87.92|366:30.69,-88.10|367:32.29,-87.43|368:32.58,-85.32|369:32.21,-88.27|370:36.12,-86.78|371:36.10,-86.54|372:36.17,-86.79|373:35.24,-85.22|374:35.05,-85.31|375:35.16,-90.02|376:36.37,-82.38|377:36.16,-84.01|378:36.11,-83.74|379:35.98,-83.96|380:35.34,-89.48|381:35.18,-89.97|382:36.30,-88.70|383:35.61,-88.54|384:35.21,-87.30|385:36.18,-85.45|386:34.60,-89.93|387:33.56,-90.83|388:34.28,-88.64|389:33.78,-89.99|390:32.40,-90.17|391:32.39,-90.12|392:32.30,-90.18|393:32.42,-88.73|394:31.34,-89.29|395:30.41,-89.07|396:31.37,-90.48|397:33.54,-88.82|398:31.31,-84.60|399:33.75,-84.39|400:38.22,-85.35|401:37.89,-86.18|402:38.19,-85.68|403:38.05,-84.15|404:37.52,-84.34|405:38.03,-84.47|406:38.23,-84.87|407:37.02,-84.11|408:36.88,-83.32|409:36.89,-83.75|410:38.78,-84.48|411:38.37,-82.93|412:37.84,-82.74|413:37.57,-83.58|414:37.88,-83.10|415:37.45,-82.34|416:37.51,-82.72|417:37.24,-83.20|418:37.19,-82.87|420:36.92,-88.58|421:36.89,-86.05|422:36.92,-86.98|423:37.49,-87.05|424:37.49,-87.64|425:37.16,-84.63|426:36.73,-84.50|427:37.37,-85.73|430:40.14,-82.85|431:39.73,-82.89|432:39.97,-83.01|433:40.52,-83.32|434:41.50,-83.36|435:41.47,-84.06|436:41.68,-83.50|437:39.86,-81.62|438:40.28,-81.87|439:40.18,-80.84|440:41.53,-81.34|441:41.48,-81.67|442:41.13,-81.54|443:41.08,-81.52|444:41.10,-80.76|445:41.10,-80.66|446:40.66,-81.41|447:40.81,-81.37|448:41.04,-82.73|449:40.76,-82.52|450:39.41,-84.55|451:39.16,-83.95|452:39.17,-84.54|453:39.97,-84.33|454:39.75,-84.20|455:39.93,-83.81|456:38.89,-82.81|457:39.40,-81.84|458:40.83,-84.18|459:39.17,-84.54|460:40.13,-86.02|461:39.65,-86.18|462:39.78,-86.13|463:41.47,-87.21|464:41.58,-87.34|465:41.45,-86.01|466:41.68,-86.25|467:41.23,-85.18|468:41.09,-85.07|469:40.68,-86.12|470:39.15,-85.07|471:38.35,-85.94|472:39.03,-85.74|473:40.05,-85.21|474:39.09,-86.60|475:38.36,-86.98|476:38.17,-87.41|477:38.00,-87.58|478:39.47,-87.36|479:40.39,-86.98|480:42.60,-82.92|481:42.25,-83.48|482:42.35,-83.10|483:42.64,-83.35|484:43.19,-83.31|485:43.01,-83.70|486:43.73,-84.21|487:43.73,-83.57|488:43.02,-84.74|489:42.73,-84.56|490:42.25,-85.55|491:41.87,-86.49|492:42.04,-84.38|493:43.22,-85.52|494:43.18,-86.15|495:42.97,-85.62|496:44.61,-85.62|497:45.44,-84.62|498:46.05,-87.42|499:46.77,-88.63|500:41.73,-93.64|501:41.67,-93.45|502:41.58,-93.66|503:41.67,-93.57|504:43.21,-93.37|505:42.73,-94.40|506:42.61,-92.48|507:42.47,-92.32|508:40.95,-94.52|509:41.67,-93.57|510:42.62,-95.91|511:42.50,-96.38|512:43.27,-95.99|513:43.30,-95.12|514:42.09,-95.07|515:41.46,-95.55|516:40.74,-95.36|520:42.50,-90.96|521:43.14,-91.77|522:41.90,-91.69|523:41.96,-91.77|524:42.06,-91.61|525:40.96,-92.41|526:40.86,-91.44|527:41.69,-90.73|528:41.56,-90.61|530:43.40,-88.19|531:42.70,-88.22|532:43.04,-87.93|534:42.73,-87.80|535:42.97,-89.56|537:43.07,-89.42|538:42.83,-90.71|539:43.59,-89.47|540:45.06,-92.54|541:44.80,-88.24|542:44.50,-87.62|543:44.49,-88.02|544:44.89,-89.79|545:45.92,-89.85|546:43.91,-90.94|547:44.81,-91.52|548:45.86,-91.72|549:44.19,-88.76|550:45.02,-92.99|551:44.96,-93.11|553:44.94,-93.80|554:44.98,-93.27|555:45.02,-93.80|556:47.54,-91.21|557:47.26,-92.73|558:46.78,-92.11|559:43.91,-92.40|560:44.01,-93.94|561:43.88,-95.77|562:44.98,-95.68|563:45.71,-94.46|564:46.51,-94.53|565:46.87,-96.08|566:47.74,-94.48|567:48.45,-96.37|569:0.00,0.00|570:43.45,-96.96|571:43.60,-96.73|572:45.04,-97.07|573:43.77,-98.38|574:45.39,-98.51|575:43.64,-100.38|576:45.56,-101.33|577:44.10,-103.22|580:46.69,-97.29|581:46.88,-96.79|582:48.15,-97.54|583:48.32,-99.14|584:47.00,-98.88|585:46.81,-100.79|586:46.82,-102.79|587:48.34,-101.36|588:48.23,-103.47|590:45.74,-108.83|591:45.78,-108.50|592:48.40,-105.16|593:46.41,-105.21|594:47.57,-111.29|595:48.58,-109.27|596:46.59,-112.03|597:45.67,-112.21|598:46.98,-114.12|599:48.37,-114.33|600:42.20,-87.97|601:41.95,-88.13|602:42.05,-87.69|603:41.89,-87.79|604:41.55,-87.82|605:41.76,-88.24|606:41.85,-87.68|607:41.96,-87.81|608:41.70,-87.72|609:40.83,-87.89|610:42.26,-89.52|611:42.32,-89.09|612:41.49,-90.36|613:41.34,-89.22|614:40.89,-90.40|615:40.68,-89.65|616:40.71,-89.61|617:40.51,-88.95|618:40.11,-88.16|619:39.70,-88.17|620:39.07,-90.07|622:38.51,-89.81|623:40.03,-91.09|624:39.06,-88.14|625:39.76,-89.19|626:39.85,-89.97|627:39.76,-89.61|628:38.31,-88.77|629:37.58,-89.08|630:38.45,-90.57|631:38.64,-90.25|633:38.90,-91.00|634:39.95,-91.74|635:40.25,-92.59|636:37.68,-90.65|637:37.31,-89.72|638:36.52,-89.82|639:36.83,-90.45|640:39.10,-94.28|641:39.10,-94.58|644:40.19,-94.67|645:39.76,-94.84|646:39.80,-93.55|647:38.08,-94.24|648:37.02,-94.44|649:39.02,-94.57|650:38.46,-92.38|651:38.58,-92.17|652:39.16,-92.35|653:38.72,-93.23|654:37.77,-91.89|655:37.69,-91.86|656:36.94,-93.25|657:36.97,-93.11|658:37.21,-93.30|660:38.93,-95.12|661:39.10,-94.70|662:38.96,-94.71|664:39.44,-95.96|665:39.27,-96.04|666:39.04,-95.68|667:37.60,-94.99|668:38.37,-96.37|669:39.79,-97.64|670:37.58,-97.51|671:37.49,-97.45|672:37.69,-97.34|673:37.18,-95.72|674:38.91,-97.67|675:38.21,-98.78|676:39.32,-99.33|677:39.35,-101.03|678:37.78,-100.61|679:37.11,-101.33|680:41.38,-96.44|681:41.26,-95.96|683:40.47,-96.82|684:40.53,-96.59|685:40.81,-96.69|686:41.46,-97.49|687:42.40,-97.54|688:41.10,-98.96|689:40.32,-98.74|690:40.27,-100.75|691:41.20,-101.54|692:42.81,-100.62|693:41.99,-103.16|700:29.96,-90.15|701:29.95,-90.08|703:29.69,-90.77|704:30.53,-90.18|705:30.22,-92.08|706:30.26,-93.23|707:30.54,-91.14|708:30.49,-91.08|710:32.51,-93.45|711:32.61,-93.75|712:32.53,-92.07|713:31.27,-92.05|714:31.56,-92.84|716:33.66,-91.79|717:33.44,-92.76|718:33.70,-93.81|719:34.42,-93.42|720:34.99,-92.03|721:34.84,-92.19|722:34.75,-92.37|723:35.10,-90.56|724:36.03,-90.73|725:36.06,-91.78|726:36.23,-92.84|727:36.17,-94.18|728:35.30,-93.40|729:35.39,-94.33|730:35.29,-97.64|731:35.50,-97.51|733:30.33,-97.77|734:34.23,-97.18|735:34.59,-98.62|736:35.45,-99.22|737:36.38,-98.07|738:36.43,-99.48|739:36.74,-101.35|740:36.19,-96.06|741:36.14,-95.99|743:36.50,-94.93|744:35.66,-95.50|745:34.67,-95.70|746:36.70,-97.15|747:34.01,-95.43|748:35.23,-96.72|749:35.17,-94.65|750:32.99,-96.78|751:32.59,-96.47|752:32.78,-96.79|753:32.77,-96.78|754:33.38,-95.79|755:33.34,-94.26|756:32.51,-94.71|757:32.30,-95.30|758:31.50,-95.71|759:31.33,-94.42|760:32.74,-97.23|761:32.77,-97.29|762:33.38,-97.22|763:33.86,-98.60|764:32.47,-98.40|765:31.09,-97.54|766:31.78,-96.99|767:31.55,-97.17|768:31.45,-99.32|769:31.45,-100.48|770:29.76,-95.41|772:29.83,-95.43|773:30.30,-95.42|774:29.55,-95.92|775:29.56,-95.05|776:30.07,-94.10|777:30.09,-94.13|778:30.65,-96.34|779:28.85,-96.96|780:29.07,-98.87|781:29.26,-97.98|782:29.44,-98.47|783:27.78,-97.79|784:27.78,-97.41|785:26.24,-98.01|786:30.34,-97.82|787:30.33,-97.75|788:29.34,-99.84|789:29.92,-96.80|790:35.43,-101.73|791:35.23,-101.88|792:34.24,-100.78|793:33.59,-102.25|794:33.58,-101.86|795:32.63,-100.12|796:32.45,-99.73|797:31.85,-102.35|798:30.83,-104.62|799:31.76,-106.41|800:39.80,-105.01|801:39.57,-104.94|802:39.74,-104.98|803:40.02,-105.26|804:39.76,-105.82|805:40.44,-105.09|806:40.38,-104.71|807:40.58,-103.12|808:39.00,-103.91|809:38.83,-104.82|810:38.08,-103.88|811:37.28,-106.03|812:38.48,-106.15|813:37.35,-108.47|814:38.42,-107.93|815:39.08,-108.55|816:39.56,-107.32|820:41.19,-104.84|821:44.57,-110.44|822:42.24,-104.52|823:41.72,-107.18|824:44.48,-108.40|825:43.02,-108.65|826:42.90,-106.36|827:44.36,-104.66|828:44.70,-106.88|829:41.59,-109.86|830:43.59,-110.74|831:42.70,-110.92|832:42.72,-112.25|833:42.69,-114.31|834:43.85,-111.95|835:46.24,-116.31|836:43.73,-116.45|837:43.60,-116.24|838:47.59,-116.58|840:40.55,-111.74|841:40.69,-111.90|842:41.25,-111.98|843:41.74,-111.99|844:41.26,-111.96|845:39.00,-110.41|846:39.49,-111.82|847:37.68,-112.69|850:33.45,-112.07|851:33.01,-111.55|852:33.39,-111.79|853:33.58,-112.40|855:33.22,-110.29|856:31.67,-110.38|857:32.22,-110.93|859:34.26,-109.99|860:35.54,-111.46|863:34.67,-112.31|864:35.16,-114.32|865:36.10,-109.45|870:35.13,-106.70|871:35.06,-106.67|873:35.51,-108.67|874:36.74,-108.18|875:36.13,-105.94|876:32.99,-106.98|877:35.99,-105.11|878:34.08,-107.63|879:32.91,-107.28|880:32.32,-107.63|881:34.33,-103.34|882:32.81,-104.08|883:33.33,-105.65|884:35.46,-103.78|885:31.69,-106.30|888:0.00,0.00|889:36.04,-114.98|890:36.26,-115.12|891:36.17,-115.14|893:39.28,-114.99|894:39.47,-119.36|895:39.53,-119.81|897:39.17,-119.78|898:40.91,-115.53|900:34.05,-118.26|901:34.00,-118.17|902:33.94,-118.35|903:33.96,-118.35|904:34.02,-118.49|905:33.80,-118.30|906:33.93,-118.03|907:33.80,-118.16|908:33.78,-118.19|910:34.17,-118.13|911:34.15,-118.14|912:34.15,-118.26|913:34.23,-118.54|914:34.19,-118.45|915:34.18,-118.31|916:34.17,-118.38|917:34.07,-117.86|918:34.10,-118.13|919:32.67,-117.00|920:33.14,-117.19|921:32.72,-117.16|922:33.74,-116.24|923:34.26,-117.20|924:34.11,-117.29|925:33.79,-117.23|926:33.64,-117.78|927:33.74,-117.86|928:33.84,-117.87|930:34.28,-119.15|931:34.42,-119.71|932:36.00,-119.25|933:35.32,-118.99|934:35.22,-120.62|935:35.13,-118.07|936:36.83,-119.65|937:36.75,-119.64|938:36.75,-119.64|939:36.60,-121.66|940:37.45,-122.29|941:37.77,-122.42|942:38.58,-121.49|943:37.44,-122.14|944:37.55,-122.32|945:37.92,-122.05|946:37.80,-122.27|947:37.87,-122.27|948:37.94,-122.34|949:38.03,-122.59|950:37.10,-121.96|951:37.33,-121.89|952:38.08,-121.20|953:37.65,-120.75|954:38.82,-122.97|955:40.73,-124.01|956:38.67,-121.28|957:38.78,-120.99|958:38.58,-121.45|959:39.48,-121.55|960:40.74,-122.33|961:39.75,-120.18|967:20.89,-156.66|968:21.31,-157.86|969:13.41,144.71|970:45.42,-122.54|971:45.53,-123.31|972:45.52,-122.68|973:44.80,-123.05|974:43.70,-123.32|975:42.38,-123.05|976:42.29,-121.42|977:44.06,-121.13|978:45.34,-118.67|979:43.93,-117.49|980:47.56,-122.20|981:47.61,-122.33|982:48.41,-122.28|983:47.42,-122.61|984:47.23,-122.44|985:46.96,-123.04|986:45.82,-122.62|988:47.72,-119.98|989:46.60,-120.54|990:47.64,-117.38|991:47.93,-117.95|992:47.65,-117.43|993:46.27,-119.10|994:46.13,-117.06|995:61.17,-150.04|996:60.61,-156.55|997:65.00,-149.99|998:58.29,-134.62|999:55.55,-132.35";
const ZIP3={}; ZIP3_RAW.split("|").forEach(r=>{const [k,v]=r.split(":");const [a,b]=v.split(",");ZIP3[k]=[+a,+b]});
const CITIES=[["Albuquerque",35.08,-106.65],["Anchorage",61.22,-149.90],["Atlanta",33.75,-84.39],["Austin",30.27,-97.74],["Baltimore",39.29,-76.61],["Birmingham",33.52,-86.80],["Boise",43.62,-116.20],["Boston",42.36,-71.06],["Buffalo",42.89,-78.88],["Charlotte",35.23,-80.84],["Chicago",41.88,-87.63],["Cincinnati",39.10,-84.51],["Cleveland",41.50,-81.69],["Columbus",39.96,-83.00],["Dallas",32.78,-96.80],["Denver",39.74,-104.99],["Detroit",42.33,-83.05],["El Paso",31.76,-106.49],["Hartford",41.76,-72.68],["Honolulu",21.31,-157.86],["Houston",29.76,-95.37],["Indianapolis",39.77,-86.16],["Jacksonville",30.33,-81.66],["Kansas City",39.10,-94.58],["Las Vegas",36.17,-115.14],["Los Angeles",34.05,-118.24],["Louisville",38.25,-85.76],["Memphis",35.15,-90.05],["Miami",25.76,-80.19],["Milwaukee",43.04,-87.91],["Minneapolis",44.98,-93.27],["Nashville",36.16,-86.78],["New Orleans",29.95,-90.07],["New York",40.71,-74.01],["Oklahoma City",35.47,-97.52],["Omaha",41.26,-95.93],["Orlando",28.54,-81.38],["Philadelphia",39.95,-75.17],["Phoenix",33.45,-112.07],["Pittsburgh",40.44,-80.00],["Portland",45.52,-122.68],["Providence",41.82,-71.41],["Raleigh",35.78,-78.64],["Richmond",37.54,-77.44],["Sacramento",38.58,-121.49],["Salt Lake City",40.76,-111.89],["San Antonio",29.42,-98.49],["San Diego",32.72,-117.16],["San Francisco",37.77,-122.42],["San Jose",37.34,-121.89],["San Juan",18.47,-66.11],["Seattle",47.61,-122.33],["St. Louis",38.63,-90.20],["Tampa",27.95,-82.46],["Washington, DC",38.91,-77.04]];
function miles(a,b,c,d){const R=3958.8,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
  const x=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function nearestCity(lat,lon){
  let best=null; for(const [city,a,b] of CITIES){const mi=miles(lat,lon,a,b); if(!best||mi<best.mi) best={city,mi}}
  return best;
}
function lookupZip(zip){ // returns {city,mi} or null
  const c=ZIP3[zip.slice(0,3)]; return c?nearestCity(c[0],c[1]):null;
}
// Hand-written events exist for Chicago, Austin and Atlanta. Every other city gets the same four event types.
function ensureEvents(city){
  if(EVENTS.some(e=>e.city===city)) return;
  const slug=city.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  let n=0; for(const ch of city) n=(n*31+ch.charCodeAt(0))%97;
  EVENTS.push(
   {id:slug+"-1",city,title:"Neighborhood Cleanup",org:"Boys & Girls Club of America",cause:"Environment",date:"2026-12-01",time:"4:00–7:00 PM",hours:3,where:"Your local club, meet at the front lot",spots:12+n%20,about:"We need volunteers to clear litter from the blocks around the club. Gloves, bags and grabbers are provided. Bring water and wear closed-toe shoes."},
   {id:slug+"-2",city,title:"Holiday Food Pantry Sort",org:city+" Community Pantry",cause:"Hunger",date:"2026-10-24",time:"9:00 AM–12:00 PM",hours:3,where:"Pantry warehouse, Door B",spots:8+n%14,about:"Sort and box donated groceries for neighbors ahead of the holidays. Light lifting involved."},
   {id:slug+"-3",city,title:"Reading Buddies",org:"Pageturners Literacy Project",cause:"Education",date:"2026-11-07",time:"10:00 AM–12:00 PM",hours:2,where:"Branch library, children's room",spots:6+n%10,about:"Pair up with a grade-schooler and read together. No experience needed. We'll show you how at a 15-minute welcome."},
   {id:slug+"-4",city,title:"Tech Help for Seniors",org:"Silver Connect",cause:"Seniors",date:"2026-11-21",time:"1:00–3:00 PM",hours:2,where:"Community center, Room 4",spots:6+n%9,about:"Help neighbors set up video calls, email and appointment portals, one-on-one."}
  );
}
function newsFor(city){
  if(SAMPLE_NEWS[city]) return SAMPLE_NEWS[city];
  ensureEvents(city); const es=EVENTS.filter(e=>e.city===city);
  return [{hl:city+" streets collect litter as fall weather rolls through",src:"Sample headline",idea:"Join a neighborhood cleanup",ev:es[0].id},
          {hl:city+" food pantries ask for holiday help",src:"Sample headline",idea:"Sort food boxes for neighbors",ev:es[1].id}];
}
function setCity(city,zip,mi){ensureEvents(city);state.city=city;state.cause="All";state.zip=zip||"";state.dist=mi==null?null:mi}

/* ============ STATE ============ */
let state;
function freshState(){
  return {screen:1,user:null,city:"Chicago",cause:"All",eventId:"c1",joined:[],checked:[],log:initialLog(),
          raffle:false,ig:null,chats:{},news:null,loginMode:"login",idType:"School ID",loginErr:"",nameDraft:"",zip:"",dist:null,locOpen:false,locErr:"",newsCity:null,igShare:false,threads:[],blocked:[],reports:[],view:"list",threadId:null,newEv:null,reportFor:null,openMsg:null,confirmBlock:null,checkinId:null};
}
state = freshState();

/* ============ HELPERS ============ */
const root = r=>typeof r==="string"?document.querySelector(r):r;
const $ = (s,r=document)=>root(r).querySelector(s);
const $$ = (s,r=document)=>[...root(r).querySelectorAll(s)];
const esc = t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ev = id=>EVENTS.find(e=>e.id===id);
const total = ()=>state.log.reduce((a,b)=>a+b.hours,0);
const fmtDate = d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const mon = d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short"});
const day = d=>new Date(d+"T12:00:00").getDate();
let toastT;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),2600)}

const I = {
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
 clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 ig:'<svg class="ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg>'
};
const mark = logoImg();
function bot(w=78){
  return `<svg width="${w}" viewBox="0 0 80 120" aria-hidden="true">
  <line x1="40" y1="6" x2="40" y2="16" stroke="#1E1450" stroke-width="3"/><circle cx="40" cy="6" r="4" fill="#FFF5B0" stroke="#1E1450" stroke-width="2.5"/>
  <rect x="14" y="16" width="52" height="38" rx="14" fill="#5BA8C8" stroke="#1E1450" stroke-width="3"/>
  <circle cx="30" cy="35" r="7" fill="#fff" stroke="#1E1450" stroke-width="2.5"/><circle cx="50" cy="35" r="7" fill="#fff" stroke="#1E1450" stroke-width="2.5"/>
  <circle cx="31" cy="36" r="3" fill="#1E1450"/><circle cx="51" cy="36" r="3" fill="#1E1450"/>
  <rect x="22" y="58" width="36" height="38" rx="10" fill="#7DBBD6" stroke="#1E1450" stroke-width="3"/>
  <rect x="30" y="66" width="20" height="14" rx="3" fill="#FFF5B0" stroke="#1E1450" stroke-width="2"/>
  <path d="M58 68c10 2 12 8 10 14" fill="none" stroke="#1E1450" stroke-width="3" stroke-linecap="round"/>
  <circle cx="69" cy="76" r="4" fill="#F2A7C3" stroke="#1E1450" stroke-width="2"/><path d="M69 80v10" stroke="#2F9E6E" stroke-width="2.5"/>
  <path d="M26 96v16M54 96v16" stroke="#1E1450" stroke-width="4" stroke-linecap="round"/></svg>`;
}

/* ============ NAV ============ */
function go(n){
  if(n>1 && !state.user){ state.user={name:"Alex",idType:"School ID",demo:true}; toast("Signed in as demo student Alex"); }
  state.screen=n;
  if(OVERVIEW){ renderAllKeep(); $("#s"+n).scrollTop=0; flash(n); return; }
  $$(".screen").forEach((s,i)=>s.classList.toggle("active",i+1===n));
  $("#tabs").hidden = false;
  closeNav(false);
  $$("#tabs button").forEach(b=>b.setAttribute("aria-current",+b.dataset.go===n));
  $$("#railList button").forEach(b=>b.setAttribute("aria-current",+b.dataset.go===n));
  ({1:r1,2:r2,3:r3,4:r4,5:r5,6:r6})[n]();
  updateBadge();
  $("#s"+n).scrollTop=0;
}
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g){go(+g.dataset.go)}
});


/* ============ 1 SIGN IN ============ */
function r1(){
  const s=state, signup=s.loginMode==="signup";
  $("#s1").innerHTML=`
   <div class="hero-logo"><img src="${LOGO}" alt="Helply logo: a heart-shaped globe held in an open hand"><b>Helply</b><span>Volunteer. Connect. Grow.</span></div>
   <h1 class="hero-line" style="text-align:center;font-size:30px;margin-top:16px">Serve your city. Earn your hours.</h1>
   <p class="sub">Find volunteer events near you, check in with a QR code, and track every hour.</p>
   <div class="raffle-note">${I.star.replace('<svg','<svg width="22" height="22"')}<span>Reach ${RAFFLE_MIN_HOURS} service hours to enter the scholarship raffle.</span></div>
   <div class="seg" role="group" aria-label="Account">
     <button data-mode="login" aria-pressed="${!signup}">Log in</button>
     <button data-mode="signup" aria-pressed="${signup}">Sign up with ID</button>
   </div>
   <div class="field"><label for="fn">Your name</label><input id="fn" autocomplete="given-name" placeholder="Type your name" maxlength="30" value="${esc(s.nameDraft||"")}"></div>
   ${signup?`
   <div class="seg" role="group" aria-label="ID type">
     <button data-idt="School ID" aria-pressed="${s.idType==="School ID"}">School ID</button>
     <button data-idt="State ID" aria-pressed="${s.idType==="State ID"}">State ID</button>
   </div>
   `:""}
   <div class="field"><label for="idn">${signup?s.idType+" number":"School or state ID number"}</label>
     <input id="idn" inputmode="text" autocomplete="off" placeholder="e.g. 20481733"></div>
   <p class="err" id="err">${esc(s.loginErr)}</p>
   <button class="btn block" id="loginBtn">${signup?"Create account":"Log in"}</button>
   <p class="sub" style="margin-top:14px">Prototype: any name and an ID of 6 or more characters works. Your ID number is never sent anywhere.</p>
   <p class="sub" style="margin-top:6px">We share your name and activity (event sign-ups, check-ins, raffle entries and reports) with Helply's organizers.</p>`;
  $$("[data-mode]","#s1").forEach(b=>b.onclick=()=>{s.loginMode=b.dataset.mode;s.loginErr="";r1()});
  $$("[data-idt]","#s1").forEach(b=>b.onclick=()=>{s.idType=b.dataset.idt;r1()});
  $("#fn").oninput=e=>{s.nameDraft=e.target.value};
  const submit=()=>{
    const id=$("#idn").value.trim(), fn=$("#fn").value.trim();
    s.nameDraft=fn;
    if(!fn){s.loginErr="Type your name so organizers know who to expect.";$("#err").textContent=s.loginErr;$("#fn").focus();return}
    if(id.length<6){s.loginErr=`Enter at least 6 characters from your ${signup?s.idType:"ID"}.`;$("#err").textContent=s.loginErr;$("#idn").focus();return}
    if(s.user&&s.user.demo){s.joined=[];s.threads=[];s.checkinId=null}
    s.user={name:fn,idType:s.idType}; s.loginErr="";
    toast(signup?"Account created. Welcome, "+fn+"!":"Welcome back, "+fn+"!");
    // The ID number itself is never sent anywhere.
    track(signup?"account_signup":"login",signup?{name:fn,id_type:s.idType}:{name:fn});
    go(2);
  };
  $("#loginBtn").onclick=submit;
  ["fn","idn"].forEach(i=>$("#"+i).onkeydown=k=>{if(k.key==="Enter")submit()});
}

/* ============ 2 DISCOVER ============ */
async function loadNews(){
  const city=state.city; state.news=null; renderNews();
  if(NEWS_API_KEY){
    try{
      const q=encodeURIComponent(`${city} AND (cleanup OR "food bank" OR volunteers OR storm)`);
      const r=await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${NEWS_API_KEY}`);
      const d=await r.json();
      const items=(d.articles||[]).slice(0,4).map(a=>{
        const t=(a.title||"").toLowerCase();
        const cause=/food|hunger|pantry/.test(t)?"Hunger":/senior|elder/.test(t)?"Seniors":/school|read|tutor|student/.test(t)?"Education":"Environment";
        const match=EVENTS.find(e=>e.city===city&&e.cause===cause)||EVENTS.find(e=>e.city===city);
        return {hl:a.title,src:(a.source&&a.source.name)||"News",idea:"Help with: "+match.title,ev:match.id};
      });
      if(items.length){state.news=items;renderNews();return}
    }catch(e){/* fall through to samples */}
  }
  state.news=newsFor(city); renderNews();
}
function renderNews(){
  const el=$("#newsStrip"); if(!el) return;
  if(!state.news){el.innerHTML='<div class="card sub">Checking local news…</div>';return}
  el.innerHTML=state.news.map(n=>`<button class="card" data-ev="${n.ev}" aria-label="${esc(n.hl)}. ${esc(n.idea)}">
     <span class="src">${esc(n.src)}</span><span class="hl">${esc(n.hl)}</span><span class="idea">${esc(n.idea)}</span></button>`).join("");
  $$("[data-ev]",el).forEach(b=>b.onclick=()=>{state.eventId=b.dataset.ev;state.city=ev(b.dataset.ev).city;go(3)});
}
function r2(){
  const s=state, list=EVENTS.filter(e=>e.city===s.city&&(s.cause==="All"||e.cause===s.cause));
  $("#s2").innerHTML=`
   <div class="topbar">
     <div class="brand" style="margin:0">${mark}<b>Helply</b></div>
     <div class="row"><button class="city loc-btn" id="locBtn" aria-expanded="${s.locOpen}" aria-controls="locPanel" aria-label="Change location. Current city ${esc(s.city)}">${I.pin}<span>${esc(s.city)}</span><span aria-hidden="true">▾</span></button>
       <div class="avatar" aria-label="Profile">${esc(s.user.name[0].toUpperCase())}</div></div>
   </div>
   ${s.locOpen?`<div class="loc-panel" id="locPanel">
     <label for="zipIn"><b>Your ZIP code</b></label>
     <p class="sub">We'll connect you to the nearest major city.</p>
     <div class="ask"><input id="zipIn" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="postal-code" placeholder="e.g. 60614" value="${esc(s.zip)}"><button class="btn small" id="zipGo">Find my city</button></div>
     <p class="err" id="zipErr">${esc(s.locErr)}</p>
     <div class="field" style="margin:8px 0 0"><label for="citySel">Or pick a major city</label>
       <select class="city" id="citySel" style="border-radius:12px;width:100%">${CITIES.map(c=>`<option ${c[0]===s.city?"selected":""}>${esc(c[0])}</option>`).join("")}</select></div>
   </div>`:""}
   <h1 class="title">Hi ${esc(s.user.name)}, here's how you can help</h1>
   ${s.zip&&s.dist!=null?`<div class="loc-note">${I.pin}<span>ZIP ${esc(s.zip)}: nearest major city is ${esc(s.city)}, ${s.dist<1?"less than 1 mile":"about "+Math.round(s.dist)+" miles"} away</span></div>`:""}
   <div class="sect" style="margin-top:16px"><h3>In the news near you</h3>
     <p class="sub">Ideas drawn from ${esc(s.city)} headlines${NEWS_API_KEY?"":" (sample data)"}</p></div>
   <div class="news" id="newsStrip"></div>
   <div class="sect" style="margin-top:6px"><h3>Opportunities in ${esc(s.city)}</h3></div>
   <div class="chips" role="group" aria-label="Filter by cause">
     ${["All",...Object.keys(CAUSES)].map(c=>`<button class="chip" data-cause="${c}" aria-pressed="${s.cause===c}">${c}</button>`).join("")}
   </div>
   <div class="list">${list.length?list.map(e=>{
     const st=s.checked.includes(e.id)?'<span class="status">Checked in</span>':s.joined.includes(e.id)?'<span class="status">You\'re signed up</span>':`<span class="sub">${spots(e)} spots left</span>`;
     return `<button class="opp" data-open="${e.id}">
       <div class="date"><small>${mon(e.date)}</small><b>${day(e.date)}</b></div>
       <div><h3>${esc(e.title)}</h3><div class="meta">${esc(e.org)}</div><div class="meta">${esc(e.time)}</div>
       <div class="foot"><span class="tag"><i class="dot" style="background:${CAUSES[e.cause]}"></i>${e.cause}</span>${st}</div></div></button>`}).join(""):
     '<div class="card empty">${mark}<b>No events for this cause yet</b><span class="sub">Try another cause to see more opportunities.</span></div>'}</div>
   <div class="foot-logo">${mark}<span>Thanks for helping your city.</span></div>`;
  $("#locBtn").onclick=()=>{s.locOpen=!s.locOpen;s.locErr="";r2();if(s.locOpen)$("#zipIn").focus()};
  if(s.locOpen){
    const zi=$("#zipIn");
    zi.oninput=e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,5)};
    const find=()=>{
      const z=zi.value.trim(); s.zip=z;
      const bad=m=>{s.locErr=m;$("#zipErr").textContent=m;zi.focus()};
      if(!/^\d{5}$/.test(z)) return bad("Enter a 5-digit ZIP code.");
      const hit=lookupZip(z);
      if(!hit) return bad("We couldn't find that ZIP code. Check the digits and try again.");
      setCity(hit.city,z,hit.mi); s.locOpen=false; s.locErr="";
      toast("Showing opportunities in "+hit.city); r2();
    };
    $("#zipGo").onclick=find; zi.onkeydown=k=>{if(k.key==="Enter")find()};
    $("#citySel").onchange=e=>{setCity(e.target.value,"",null);s.locOpen=false;toast("Showing opportunities in "+s.city);r2()};
  }
  $$("[data-cause]","#s2").forEach(b=>b.onclick=()=>{s.cause=b.dataset.cause;const y=$("#s2").scrollTop;r2();$("#s2").scrollTop=y});
  $$("[data-open]","#s2").forEach(b=>b.onclick=()=>{s.eventId=b.dataset.open;go(3)});
  if(s.newsCity!==s.city||!s.news){s.newsCity=s.city;loadNews()}else renderNews();
}
const spots = e=>e.spots-(state.joined.includes(e.id)?1:0);

/* ============ 3 EVENT + AI BOT ============ */
function r3(){
  const e=ev(state.eventId);
  $("#s3").innerHTML=`
   <button class="back" data-go="2">‹ All opportunities</button>
   <div class="ev-head">
     <span class="tag"><i class="dot" style="background:${CAUSES[e.cause]}"></i>${e.cause}</span>
     <h2>${esc(e.title)}</h2>
     <div class="muted" style="font-weight:600">${esc(e.org)}</div>
     <div class="facts">
       <div class="fact">${I.cal}<span>${fmtDate(e.date)}</span></div>
       <div class="fact">${I.clock}<span>${esc(e.time)}</span></div>
       <div class="fact">${I.pin}<span>${esc(e.where)}</span></div>
       <div class="fact">${I.star}<span>Earns ${e.hours} service hours</span></div>
     </div>
     <p>${esc(e.about)}</p>
   </div>
   <div class="bot">
     <div class="bot-top"><h3>Plan the logistics with the help of <mark>Tidy</mark>, our AI bot</h3>${bot()}</div>
     <div class="bubble">Let's find out how you'll get there and what to bring!</div>
     <div class="chips" id="botChips">
       ${["What should I bring?","How do I get there?","Plan a safety check","How many friends can join?"].map(q=>`<button class="chip" data-q="${q}">${q}</button>`).join("")}
     </div>
     <div class="log" id="chatLog" aria-live="polite"></div>
     <div class="ask"><input id="chatIn" placeholder="Ask Tidy about this event" aria-label="Ask Tidy"><button class="btn small" id="chatSend">Send</button></div>
   </div>
   <div class="cta" id="cta"></div>`;
  renderCta(); renderChat(false);
  $$("[data-q]","#s3").forEach(b=>b.onclick=()=>askBot(b.dataset.q));
  const send=()=>{const i=$("#chatIn");const v=i.value.trim();if(v){i.value="";askBot(v)}};
  $("#chatSend").onclick=send; $("#chatIn").onkeydown=k=>{if(k.key==="Enter")send()};
}
function renderCta(){
  const e=ev(state.eventId), j=state.joined.includes(e.id), c=$("#cta");
  c.innerHTML=j?`<button class="btn block" data-go="4">You're signed up · Show my QR code</button><button class="btn block" id="chatBtn" style="margin-top:8px">Open event chat</button>`
              :`<button class="btn block" id="joinBtn">Sign up · ${spots(e)} spots left</button>`;
  const b=$("#joinBtn"); if(b) b.onclick=()=>{state.joined.push(e.id);state.checkinId=e.id;ensureThreads();toast("You're signed up. Your QR code and event chat are ready.");renderCta();
    track("event_signup",{name:state.user.name,event:e.title,event_id:e.id,organization:e.org,city:e.city,date:e.date,time:e.time});};
  const cb=$("#chatBtn"); if(cb) cb.onclick=()=>{ensureThreads();state.view="chat";state.threadId="g:"+e.id;state.openMsg=null;go(6)};
}
function chatOf(id){return state.chats[id]||(state.chats[id]=[])}
function fmtMsg(t){
  const lines=esc(t).split("\n"); let out="",ul=false;
  lines.forEach(l=>{
    if(/^\s*[-•*]\s+/.test(l)){ if(!ul){out+="<ul>";ul=true} out+="<li>"+l.replace(/^\s*[-•*]\s+/,"")+"</li>" }
    else { if(ul){out+="</ul>";ul=false} if(l.trim()) out+=(out&&!out.endsWith("</ul>")?"<br>":"")+l }
  });
  return out+(ul?"</ul>":"");
}
function renderChat(typing){
  const log=$("#chatLog"); if(!log) return;
  const e=ev(state.eventId);
  const hist=chatOf(e.id);
  log.innerHTML=hist.map(m=>`<div class="msg ${m.role==="user"?"me":"bot"}">${fmtMsg(m.content)}</div>`).join("")+
    (typing?'<div class="msg bot"><span class="typing"><i></i><i></i><i></i></span></div>':"");
  if(hist.length||typing) log.lastElementChild.scrollIntoView({block:"nearest"});
}
function fallbackReply(q){
  const t=q.toLowerCase(), e=ev(state.eventId), start=e.time.split("–")[0];
  const has=re=>re.test(t);
  if(has(/\b(hi|hello|hey|yo|sup)\b/)) return `Hi ${state.user?state.user.name:"there"}! I'm Tidy. I can help you plan ${e.title}: what to bring, how to get there, safety, or who to invite. What do you want to start with?`;
  if(has(/bring|wear|pack|need|supplies|gear|shoe|clothes|dress/)) return `Packing list for ${e.title}:\n- Water bottle and a snack\n- Closed-toe shoes and clothes you can get dirty\n- A layer for the weather\n- Your phone with your QR code\n${e.cause==="Environment"?"- Gloves, bags and tools are provided":"- Everything else is provided on site"}`;
  if(has(/rain|weather|cold|hot|sun|storm|snow/)) return `Check the forecast the night before. Most events still run in light rain, so bring a jacket and shoes that can get wet. If the weather turns bad, ${e.org} will message everyone who signed up.`;
  if(has(/get there|travel|bus|train|ride|transit|drive|park|late|how far|directions|where/)) return `The event is at ${e.where}.\n- Leave 30 minutes early\n- Check bus or train times the night before\n- Carpool with another volunteer if you can\n- Arrive 10 minutes before ${start}`;
  if(has(/safe|risk|danger|parent|guardian|supervis/)) return `Safety check:\n- Tell a parent or guardian where you'll be and when you'll be home\n- Find the organizer when you arrive\n- Stay with your group\n- Take water breaks`;
  if(has(/friend|brother|sister|sibling|bring someone|group|how many|invite|team|class/)) return `${spots(e)} spots are open. Groups of 3 to 5 friends work well. Each person should sign up on Helply so their hours count. Younger siblings may need an adult with them, so check with ${e.org} first.`;
  if(has(/hour|credit|count|service|raffle|scholarship/)) return `${e.title} earns ${e.hours} service hours once you're checked in with your QR code. Reach ${RAFFLE_MIN_HOURS} hours to enter the scholarship raffle.`;
  if(has(/when|time|date|long|start|end|schedule/)) return `${e.title} is ${fmtDate(e.date)}, ${e.time}. Plan to arrive by ${start} so you can check in.`;
  if(has(/food|eat|lunch|snack|water|drink/)) return `Bring a water bottle and a snack. ${e.hours>=3?"It's a longer shift, so pack something filling.":"It's a short shift, so a snack is plenty."}`;
  if(has(/what|about|tell|detail|do/)) return `${e.about}`;
  return `Good question. For ${e.title}, the basics are: arrive by ${start}, bring water, and keep your QR code handy. Ask me about packing, getting there, safety, weather or friends.`;
}
async function askBot(text){
  const e=ev(state.eventId), hist=chatOf(e.id);
  hist.push({role:"user",content:text}); renderChat(true);
  let reply;
  try{
    if(!TIDY_ENDPOINT) throw new Error("no AI endpoint configured");
    const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),9000);
    const r=await fetch(TIDY_ENDPOINT,{method:"POST",signal:ctl.signal,headers:{"Content-Type":"application/json"},
      body:JSON.stringify({event:{title:e.title,org:e.org,date:fmtDate(e.date),time:e.time,where:e.where,about:e.about},
        messages:hist.map(m=>({role:m.role,content:m.content}))})});
    clearTimeout(to);
    if(!r.ok) throw new Error("tidy "+r.status);
    const d=await r.json(); reply=String(d.reply||"").trim();
    if(!reply) throw new Error("empty");
  }catch(err){ reply=fallbackReply(text); }
  hist.push({role:"assistant",content:reply});
  if(isShown(3)) renderChat(false);
}

/* ============ 4 CHECK-IN ============ */
function r4(){
  const s=state, joined=s.joined;
  if(!joined.length){
    $("#s4").innerHTML=`<h1 class="title">Check-in</h1>
     <div class="card empty">${mark}<b>No events yet</b><span class="sub">Sign up for an event to get your personal check-in QR code.</span>
     <button class="btn" data-go="2">Find an event</button></div>`; return;
  }
  if(!joined.includes(s.checkinId)) s.checkinId=joined.includes(s.eventId)?s.eventId:joined[0];
  const e=ev(s.checkinId), done=s.checked.includes(e.id);
  $("#s4").innerHTML=`<h1 class="title">Check-in</h1>
   ${joined.length>1?`<div class="field" style="margin-top:10px"><label for="evSel">Event</label><select class="city" id="evSel" style="border-radius:12px">${joined.map(id=>`<option value="${id}" ${id===e.id?"selected":""}>${esc(ev(id).title)}</option>`).join("")}</select></div>`:""}
   ${done?`<div class="card ok">${mark}<div class="big">${I.check}</div><h2>You're checked in</h2>
        <p>${e.hours} hours were added for ${esc(e.title)}.</p><button class="btn" data-go="5">See my hours</button></div>`
   :`<div class="card qr-card">
        <div><h2 style="font-size:22px">${esc(e.title)}</h2><div class="sub">${fmtDate(e.date)} · ${esc(e.time)}</div></div>
        <div class="qr-box" id="qr" role="img" aria-label="Your check-in QR code"></div>
        <div class="sub">${esc(s.user.name)} · ${esc(s.user.idType)}</div>
      </div>
      <ol class="steps"><li>Arrive 10 minutes early and find the organizer.</li><li>Hold this code up to the organizer's phone.</li><li>Your hours appear in your tracker right away.</li></ol>
      <button class="btn ghost block" id="scanBtn" style="margin-top:16px">Demo: simulate organizer scan</button>`}`;
  const sel=$("#evSel"); if(sel) sel.onchange=x=>{s.checkinId=x.target.value;r4()};
  const q=$("#qr");
  if(q){
    const payload=`helply://checkin?event=${e.id}&user=${encodeURIComponent(s.user.name)}`;
    try{ new QRCode(q,{text:payload,width:196,height:196,colorDark:"#1E1450",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M}) }
    catch(err){ q.innerHTML=fakeQR(payload) }
  }
  const sb=$("#scanBtn"); if(sb) sb.onclick=()=>{
    s.checked.push(e.id); s.log.push({title:e.title,date:mon(e.date)+" "+day(e.date),hours:e.hours});
    toast(`Checked in. +${e.hours} hours added.`); r4();
    track("event_checkin",{name:s.user.name,event:e.title,event_id:e.id,hours_added:e.hours,total_hours:total()});
  };
}
function fakeQR(str){ // offline fallback pattern
  let h=0; for(const c of str) h=(h*31+c.charCodeAt(0))>>>0;
  const n=21,u=9; let r="";
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const f=(x<7&&y<7)||(x>13&&y<7)||(x<7&&y>13);
    h=(h*1664525+1013904223)>>>0;
    if(f?((x%6===0||y%6===0||x%6===6||(x>1&&x<5&&y>1&&y<5))&&true):(h>>>28)&1) r+=`<rect x="${x*u}" y="${y*u}" width="${u}" height="${u}" fill="#1E1450"/>`;
  }
  return `<svg width="196" height="196" viewBox="0 0 ${n*u} ${n*u}">${r}</svg>`;
}

/* ============ 5 HOURS + CREW ============ */
function r5(){
  const s=state, t=total(), pct=Math.min(100,t/HOURS_GOAL*100), eligible=t>=RAFFLE_MIN_HOURS;
  const marks=[RAFFLE_MIN_HOURS,50,100,HOURS_GOAL];
  $("#s5").innerHTML=`<h1 class="title">Your service hours</h1>
   <div class="panel" style="margin-top:12px">
     <div class="row between" style="align-items:flex-end"><div><div class="hours-num">${t}</div><div class="sub">hours of ${HOURS_GOAL}</div></div>
       <div class="sub" style="text-align:right">${s.log.length} events<br>${s.checked.length} this season</div></div>
     <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="${HOURS_GOAL}" aria-valuenow="${t}" aria-label="Service hours">
       <div class="fill" style="width:${pct}%"></div>
       ${marks.map(m=>`<span class="mk" style="left:${Math.min(97,m/HOURS_GOAL*100)}%">${m}</span>`).join("")}
     </div>
   </div>
   <div class="card sect raffle-row" style="margin-top:14px">${mark}<div>
     ${s.raffle?`<b>You're in the scholarship raffle</b><p class="sub">The drawing is Dec 15. We'll message you if you win.</p>`
      :eligible?`<b>You're now eligible to enter the scholarship raffle!</b><p class="sub" style="margin-bottom:10px">One entry per volunteer.</p><button class="btn block" id="raffleBtn">Enter the raffle</button>`
      :`<b>${RAFFLE_MIN_HOURS-t} more hours to unlock the scholarship raffle</b><p class="sub">Check in at your next event to get there.</p>`}
   </div></div>
   <div class="sect"><h3>Participation</h3><div class="card">
     ${s.log.slice().reverse().map(l=>`<div class="logrow"><span>${esc(l.title)}<small class="muted" style="display:block;font-weight:400">${esc(l.date)}</small></span><span>+${l.hours} hrs</span></div>`).join("")}
   </div></div>
   <div class="sect"><h3>Instagram (optional)</h3>
     <div class="card">${s.ig?`<div class="row between"><span class="row">${I.ig}<b>@${esc(s.ig)}</b></span><button class="btn ghost small" id="unlinkIg">Remove</button></div>
        <label class="check"><input type="checkbox" id="igShare" ${s.igShare?"checked":""}>Show my handle to people in my event chats</label>
        <p class="sub" style="margin-top:8px">Your messages stay inside Helply. Sharing your handle is your choice.</p>`
      :`<p class="sub" style="margin-bottom:10px">Add your handle if you want other volunteers to find you on Instagram. Messages stay inside Helply.</p>
        <div class="field" style="margin-bottom:10px"><label for="igIn">Instagram username</label><input id="igIn" placeholder="@yourname" autocapitalize="none" autocomplete="off"></div>
        <p class="err" id="igErr"></p>
        <button class="btn block" id="linkIg">${I.ig}Add my handle</button>`}</div>
   </div>
   <div class="foot-logo">${mark}<span>Every hour counts.</span></div>`;
  const rb=$("#raffleBtn"); if(rb) rb.onclick=()=>{s.raffle=true;toast("You're entered. Good luck!");r5();
    track("raffle_entry",{name:s.user.name,total_hours:total()});};
  const li=$("#linkIg"); if(li){
    const save=()=>{
      const v=$("#igIn").value.trim().replace(/^@/,"");
      if(!IG_OK(v)){$("#igErr").textContent="Enter your username using letters, numbers, periods or underscores.";return}
      s.ig=v; toast("Instagram handle saved"); r5();
    };
    li.onclick=save; $("#igIn").onkeydown=k=>{if(k.key==="Enter")save()};
  }
  const ul=$("#unlinkIg"); if(ul) ul.onclick=()=>{s.ig=null;s.igShare=false;toast("Instagram handle removed");r5()};
  const sh=$("#igShare"); if(sh) sh.onchange=()=>{s.igShare=sh.checked;toast(s.igShare?"Your handle is visible in event chats":"Your handle is hidden")};
}

/* ============ 6 MESSAGES ============ */
const IG_OK=u=>/^[A-Za-z0-9._]{1,30}$/.test(u);
I.shield='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.1 7.5 9.5 4.4-1.4 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>';
const PEOPLE=[{id:"p1",name:"Maya R.",ig:"maya.serves"},{id:"p2",name:"Devon T.",ig:null},{id:"p3",name:"Priya S.",ig:"priya_reads"},{id:"p4",name:"Jordan L.",ig:null},{id:"p5",name:"Sofia M.",ig:null},{id:"p6",name:"Andre W.",ig:null},{id:"p7",name:"Lily C.",ig:"lily.and.lou"},{id:"p8",name:"Theo B.",ig:null},{id:"p9",name:"Nadia K.",ig:null},{id:"p10",name:"Marcus P.",ig:null}];
const REASONS=["Bullying or harassment","Asking for personal information","Inappropriate content","Spam","Something else"];
const FILLER=["Sounds good!","See you there.","Can't wait. Let's make it a good one.","Thanks for the heads up!"];
let _uid=0; const uid=()=>"m"+(++_uid);
const personOf=id=>id.startsWith("org-")?{id,name:ev(id.slice(4)).org+" staff",role:"organizer",ig:null}:PEOPLE.find(p=>p.id===id);
function attendeesOf(eventId){
  let n=0; for(const c of eventId) n=(n*7+c.charCodeAt(0))%10;
  const picks=[]; for(let i=0;i<6;i++) picks.push(PEOPLE[(n+i*3)%10]);
  return [personOf("org-"+eventId),...picks];
}
const ago=m=>Date.now()-m*60000;
const clock=t=>new Date(t).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const first=n=>n.split(" ")[0];
const initial=n=>n[0].toUpperCase();
const threadById=id=>state.threads.find(t=>t.id===id);
const isBlocked=id=>state.blocked.includes(id);
const lastT=t=>t.msgs.length?t.msgs[t.msgs.length-1].t:0;
const hiddenThread=t=>t.type==="dm"&&isBlocked(t.with);

function ensureThreads(){
  state.joined.forEach(id=>{
    if(threadById("g:"+id)) return;
    const e=ev(id), at=attendeesOf(id), start=e.time.split("–")[0];
    state.threads.push({id:"g:"+id,type:"group",eventId:id,unread:2,msgs:[
      {id:uid(),from:"org-"+id,text:`Welcome to the ${e.title} chat! We meet at ${e.where} at ${start}. Bring water, and check in with your QR code.`,t:ago(180)},
      {id:uid(),from:at[1].id,text:"Anyone want to carpool? Happy to meet up before we head over.",t:ago(95)},
      {id:uid(),from:at[2].id,text:"First time volunteering here. Excited!",t:ago(40)}]});
  });
  updateBadge();
}
function updateBadge(){
  const n=state.threads.filter(t=>!hiddenThread(t)).reduce((a,t)=>a+t.unread,0);
  ["msgBadge","msgBadge2"].forEach(id=>{const b=document.getElementById(id); if(!b) return; b.textContent=n>9?"9+":String(n); b.hidden=!n});
}
function checkSafe(text){
  if(!text.trim()) return "Type a message first.";
  if(text.length>500) return "Keep messages under 500 characters.";
  if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)||/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text)) return "For your safety, don't share phone numbers or email addresses in chat.";
  return null;
}
function replyText(text,i){
  const t=text.toLowerCase();
  if(/carpool|ride|drive|bus|train/.test(t)) return "I can drive. Meet at the main entrance 20 minutes early?";
  if(/bring|glove|wear|shoe|water/.test(t)) return "Water and closed-toe shoes. They give out gloves and bags.";
  if(/\b(hi|hello|hey)\b/.test(t)) return "Hey! Glad you're coming too.";
  if(/thank|thx/.test(t)) return "Anytime!";
  if(/\?/.test(t)) return "Good question. I'm not sure, but the organizer will know.";
  return FILLER[i%FILLER.length];
}
function sendMessage(t,text){
  t.msgs.push({id:uid(),from:"me",text:text.trim(),t:Date.now()});
  const n=t.msgs.length;
  setTimeout(()=>{
    let from;
    if(t.type==="dm"){ if(isBlocked(t.with)) return; from=t.with; }
    else{
      const pool=attendeesOf(t.eventId).filter(p=>!isBlocked(p.id)&&p.role!=="organizer");
      if(!pool.length) return; from=pool[n%pool.length].id;
    }
    t.msgs.push({id:uid(),from,text:replyText(text,n),t:Date.now()});
    const viewing=isShown(6)&&state.view==="chat"&&state.threadId===t.id;
    if(viewing) drawChat(); else { t.unread++; if(!isShown(6)) toast("New message from "+first(personOf(from).name)); }
    updateBadge();
    if(isShown(6)&&state.view==="list") drawList();
  },1400);
}
function blockPerson(id){
  if(!isBlocked(id)) state.blocked.push(id);
  toast("Blocked "+personOf(id).name+". They can't message you."); updateBadge();
}

function r6(){
  ensureThreads();
  const s=state;
  if(s.view==="chat"&&threadById(s.threadId)) return drawChat();
  if(s.view==="new") return drawNew();
  s.view="list"; drawList();
}

function threadRow(t){
  const last=t.msgs[t.msgs.length-1], g=t.type==="group";
  const title=g?ev(t.eventId).title+" chat":personOf(t.with).name;
  const prev=last?(last.from==="me"?"You: ":(g?first(personOf(last.from).name)+": ":""))+(isBlocked(last.from)?"Message hidden":last.text):"No messages yet";
  return `<button class="thread" data-thread="${t.id}"><div class="avatar t-av ${g?"grp":""}">${g?I.cal:initial(title)}</div>
    <div class="t-body"><div class="row between"><b>${esc(title)}</b><span class="sub">${last?clock(last.t):""}</span></div>
    <div class="t-prev ${t.unread?"unread":""}">${esc(prev)}</div></div>
    ${t.unread?`<span class="dotbadge" aria-label="${t.unread} unread">${t.unread}</span>`:"<span></span>"}</button>`;
}
function drawList(){
  const s=state, el=$("#s6");
  const visible=s.threads.filter(t=>!hiddenThread(t)).sort((a,b)=>lastT(b)-lastT(a));
  el.innerHTML=`<div class="topbar"><h1 class="title">Messages</h1><button class="btn small" id="newMsg">New message</button></div>
   <div class="safe-banner">${I.shield}<span>Chats are only open to people signed up for the same event. Tap any message to report it or block the sender.</span></div>
   ${visible.length?`<div class="list">${visible.map(threadRow).join("")}</div>`:
     `<div class="card empty">${mark}<b>No chats yet</b><span class="sub">Sign up for an event and its group chat shows up here.</span><button class="btn" data-go="2">Find an event</button></div>`}
   ${s.blocked.length?`<details class="card blocked"><summary>Blocked people (${s.blocked.length})</summary>${s.blocked.map(id=>`<div class="person"><div class="avatar">${initial(personOf(id).name)}</div><b>${esc(personOf(id).name)}</b><button class="btn ghost small" data-unblock="${id}">Unblock</button></div>`).join("")}</details>`:""}`;
  $("#newMsg").onclick=()=>{s.view="new";drawNew()};
  $$("[data-thread]",el).forEach(b=>b.onclick=()=>{s.view="chat";s.threadId=b.dataset.thread;s.openMsg=null;s.reportFor=null;s.confirmBlock=null;drawChat();el.scrollTop=el.scrollHeight});
  $$("[data-unblock]",el).forEach(b=>b.onclick=()=>{s.blocked=s.blocked.filter(x=>x!==b.dataset.unblock);toast("Unblocked");updateBadge();drawList()});
}

function drawNew(){
  const s=state, el=$("#s6");
  const back=()=>{$("#backList").onclick=()=>{s.view="list";drawList()}};
  if(!s.joined.length){
    el.innerHTML=`<button class="back" id="backList">‹ Messages</button><div class="card empty">${mark}<b>Sign up for an event first</b><span class="sub">You can message people from events you've signed up for.</span><button class="btn" data-go="2">Find an event</button></div>`;
    back(); return;
  }
  if(!s.joined.includes(s.newEv)) s.newEv=s.joined[0];
  const list=attendeesOf(s.newEv).filter(p=>!isBlocked(p.id));
  el.innerHTML=`<button class="back" id="backList">‹ Messages</button><h1 class="title" style="font-size:26px">New message</h1>
   <p class="sub">You can message people from events you've signed up for.</p>
   ${s.joined.length>1?`<div class="field" style="margin-top:10px"><label for="newEv">Event</label><select class="city" id="newEv" style="border-radius:12px">${s.joined.map(id=>`<option value="${id}" ${id===s.newEv?"selected":""}>${esc(ev(id).title)}</option>`).join("")}</select></div>`:`<div class="tag" style="margin:10px 0">${esc(ev(s.newEv).title)}</div>`}
   <div class="card" style="margin-top:8px">${list.length?list.map(p=>`<div class="person"><div class="avatar">${initial(p.name)}</div><div><b>${esc(p.name)}</b><small>${p.role==="organizer"?"Organizer":"Volunteer"}</small></div><button class="btn small" data-dm="${p.id}">Message</button></div>`).join(""):'<span class="sub">No one available to message for this event.</span>'}</div>`;
  back();
  const ne=$("#newEv"); if(ne) ne.onchange=()=>{s.newEv=ne.value;drawNew()};
  $$("[data-dm]",el).forEach(b=>b.onclick=()=>{
    const id=b.dataset.dm; let t=threadById("d:"+id);
    if(!t){t={id:"d:"+id,type:"dm",with:id,unread:0,msgs:[]};s.threads.push(t)}
    s.view="chat";s.threadId=t.id;s.openMsg=null;s.reportFor=null;drawChat();
  });
}

function drawChat(){
  const s=state, t=threadById(s.threadId), el=$("#s6"), g=t.type==="group";
  t.unread=0; updateBadge();
  const prev=$("#msgIn"), keep=prev?{v:prev.value,f:document.activeElement===prev}:null;
  const e=g?ev(t.eventId):null, p=g?null:personOf(t.with);
  const title=g?e.title+" chat":p.name;
  const sub=g?`${attendeesOf(t.eventId).length+1} people signed up for ${e.title}`:(p.role==="organizer"?"Event organizer":"Signed up for the same event as you");
  const igLink=(!g&&p.ig)?`<a class="iglink" href="https://www.instagram.com/${esc(p.ig)}" target="_blank" rel="noopener">${I.ig}@${esc(p.ig)}</a>`:"";
  const bubbles=t.msgs.length?t.msgs.map(m=>{
    if(m.from==="me") return `<div class="mrow me"><div class="mb me">${esc(m.text)}</div><span class="mt">${clock(m.t)}</span></div>`;
    const who=personOf(m.from);
    if(isBlocked(m.from)) return `<div class="mrow"><div class="mb hidden">Message hidden. You blocked ${esc(first(who.name))}.</div></div>`;
    const open=s.openMsg===m.id;
    return `<div class="mrow">${g?`<span class="who">${esc(who.name)}${who.role==="organizer"?' <i class="orgtag">Organizer</i>':""}</span>`:""}
      <button class="mb them ${m.reported?"reported":""}" data-msg="${m.id}" aria-expanded="${open}">${esc(m.text)}</button>
      <span class="mt">${clock(m.t)}${m.reported?" · Reported":""}</span>
      ${open?`<div class="macts"><button class="btn ghost small" data-report="${m.id}">Report</button>${who.role!=="organizer"?`<button class="btn ghost small" data-block="${m.from}">${s.confirmBlock===m.from?"Tap again to block":"Block "+esc(first(who.name))}</button>`:""}</div>`:""}</div>`;
  }).join(""):`<p class="sub" style="text-align:center">Say hello to ${esc(first(title))}. Keep it kind and about the event.</p>`;
  const rm=s.reportFor?t.msgs.find(m=>m.id===s.reportFor):null;
  const report=rm?`<div class="report" role="group" aria-label="Report message"><b>Why are you reporting this message?</b>
     ${REASONS.map((r,i)=>`<label class="check"><input type="radio" name="reason" value="${r}" ${i===0?"checked":""}>${r}</label>`).join("")}
     ${personOf(rm.from).role!=="organizer"?`<label class="check"><input type="checkbox" id="alsoBlock">Also block ${esc(first(personOf(rm.from).name))}</label>`:""}
     <div class="row" style="margin-top:6px"><button class="btn small" id="sendReport">Send report</button><button class="btn ghost small" id="cancelReport">Cancel</button></div></div>`:"";
  el.innerHTML=`<button class="back" id="backList">‹ Messages</button>
   <div class="chat-head"><div class="avatar t-av ${g?"grp":""}">${g?I.cal:initial(title)}</div><div><h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div>${igLink}</div></div>
   <div class="safe-banner small">${I.shield}<span>Never share phone numbers, addresses or emails. Tap a message to report it.</span></div>
   <div class="mlog" id="mlog" aria-live="polite">${bubbles}</div>
   <div class="composer">${report}
     <div class="ask"><input id="msgIn" autocomplete="off" maxlength="500" placeholder="Message ${g?"the group":esc(first(title))}" aria-label="Write a message"><button class="btn small" id="msgSend">Send</button></div>
     <p class="err" id="msgErr"></p></div>`;
  const inp=$("#msgIn"); if(keep){inp.value=keep.v;if(keep.f)inp.focus()}
  el.scrollTop=el.scrollHeight;

  $("#backList").onclick=()=>{s.view="list";s.openMsg=null;s.reportFor=null;s.confirmBlock=null;drawList();el.scrollTop=0};
  $$("[data-msg]",el).forEach(b=>b.onclick=()=>{s.openMsg=s.openMsg===b.dataset.msg?null:b.dataset.msg;s.confirmBlock=null;drawChat()});
  $$("[data-report]",el).forEach(b=>b.onclick=()=>{s.reportFor=b.dataset.report;s.openMsg=null;drawChat()});
  $$("[data-block]",el).forEach(b=>b.onclick=()=>{
    const id=b.dataset.block;
    if(s.confirmBlock!==id){s.confirmBlock=id;drawChat();return}
    s.confirmBlock=null;s.openMsg=null;blockPerson(id);
    if(!g){s.view="list";drawList()} else drawChat();
  });
  const sr=$("#sendReport"); if(sr){
    sr.onclick=()=>{
      const reason=($("input[name=reason]:checked",el)||{}).value||"Something else", ab=$("#alsoBlock")&&$("#alsoBlock").checked;
      rm.reported=true; s.reports.push({thread:t.id,msg:rm.id,from:rm.from,reason});
      s.reportFor=null; toast("Report sent. A moderator will review it.");
      track("message_report",{reporter:s.user.name,conversation:title,conversation_type:t.type,reported_person:personOf(rm.from).name,reason,reported_message:rm.text,also_blocked:!!ab});
      if(ab) blockPerson(rm.from);
      if(ab&&!g){s.view="list";drawList()} else drawChat();
    };
    $("#cancelReport").onclick=()=>{s.reportFor=null;drawChat()};
  }
  const send=()=>{
    const v=inp.value, err=checkSafe(v);
    if(err){$("#msgErr").textContent=err;inp.focus();return}
    inp.value=""; sendMessage(t,v); drawChat(); $("#msgIn").focus();
  };
  $("#msgSend").onclick=send; inp.onkeydown=k=>{if(k.key==="Enter")send()};
}

/* ============ NAVIGATION MENU ============ */
const NAV=[[1,"Sign in","School or state ID"],[2,"Discover","ZIP lookup, list + news ideas"],[3,"Event + Tidy bot","Date, cause, AI logistics"],[4,"Check-in","Personal QR code"],[5,"Hours","Tracker, raffle, Instagram"],[6,"Messages","Event chats, safe DMs"]];
function openNav(){
  const el=$("#navSheet");
  el.innerHTML=`<div class="ns-top"><div class="ns-brand"><img class="ns-logo" src="${LOGO}" alt=""><h2>Helply</h2></div><button class="ns-close" id="navClose" aria-label="Close menu">×</button></div>
    <p>Jump to any screen.</p>
    <ol>${NAV.map(([n,t,s])=>`<li><button data-nav="${n}" aria-current="${state.screen===n}"><b>${t}</b><span>${s}</span></button></li>`).join("")}</ol>
    <div class="ns-actions">${innerWidth>820?'<button class="reset" id="navAll">Show all screens</button>':""}<button class="reset" id="navReset">Reset demo</button></div>`;
  el.hidden=false; $("#menuBtn").setAttribute("aria-expanded","true");
  $$("[data-nav]",el).forEach(b=>b.onclick=()=>go(+b.dataset.nav));
  $("#navClose").onclick=()=>closeNav(true);
  $("#navReset").onclick=()=>{closeNav(false);resetDemo()};
  const all=$("#navAll"); if(all) all.onclick=()=>{closeNav(false);userMode="overview";applyMode()};
  const cur=$('[data-nav][aria-current="true"]',el)||$("[data-nav]",el); cur.focus();
}
function closeNav(refocus){
  const el=$("#navSheet"); if(!el||el.hidden) return;
  el.hidden=true; $("#menuBtn").setAttribute("aria-expanded","false");
  if(refocus) $("#menuBtn").focus();
}
$("#menuBtn").onclick=()=>{ $("#navSheet").hidden?openNav():closeNav(true); };
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeNav(true); });

/* ============ ALL-SCREENS LAYOUT ============ */
// On wide screens every screen is shown at once, scaled to fit the window. On phones (or via the toggle) one screen shows at a time.
const PW=360, PH=740, GAP=22, CAP=40;
let userMode="overview", OVERVIEW=false;
const RENDER={1:r1,2:r2,3:r3,4:r4,5:r5,6:r6};
const isShown=n=>OVERVIEW||state.screen===n;

function seedDemo(){ // a demo profile so every screen has something to show; real sign-in replaces it
  state.user={name:"Alex",idType:"School ID",demo:true};
  state.joined=["c2"]; state.checkinId="c2"; ensureThreads();
}
const TEXTY=el=>el.tagName==="INPUT"&&!["file","radio","checkbox","button","submit"].includes(el.type);
function renderKeep(n){ // re-render a screen without losing typed text or scroll position
  const sec=$("#s"+n), keep={};
  $$("input[id]",sec).forEach(el=>{ if(TEXTY(el)) keep[el.id]={v:el.value,f:document.activeElement===el} });
  const st=sec.scrollTop; RENDER[n](); sec.scrollTop=st;
  Object.keys(keep).forEach(id=>{ const el=document.getElementById(id); if(el&&TEXTY(el)){ el.value=keep[id].v; if(keep[id].f) el.focus(); } });
}
function renderAllKeep(){ for(let n=1;n<=6;n++) renderKeep(n); updateBadge(); }
function flash(n){
  const c=$('.cell[data-n="'+n+'"]'); if(!c) return;
  c.classList.remove("focus"); void c.offsetWidth; c.classList.add("focus");
  setTimeout(()=>c.classList.remove("focus"),1500);
}
function layoutOverview(){
  if(!OVERVIEW) return;
  const head=$("#ovHead").offsetHeight, W=innerWidth-32, H=innerHeight-head-16;
  let best=null;
  for(let cols=1;cols<=6;cols++){
    const rows=Math.ceil(6/cols), nw=cols*PW+(cols-1)*GAP, nh=rows*(PH+CAP)+(rows-1)*GAP;
    const s=Math.min(1,W/nw,H/nh);
    if(!best||s>best.s+0.001) best={s,cols,nw,nh};
  }
  $(".screens").style.cssText="--cols:"+best.cols+";width:"+best.nw+"px;transform:scale("+best.s+")";
  $("#phone").style.cssText="width:"+(best.nw*best.s)+"px;height:"+(best.nh*best.s)+"px";
}
function applyMode(){
  closeNav(false);
  OVERVIEW=userMode==="overview"&&innerWidth>820;
  document.body.classList.toggle("overview",OVERVIEW);
  if(OVERVIEW){ if(!state.user) seedDemo(); layoutOverview(); renderAllKeep(); }
  else{ $("#phone").removeAttribute("style"); $(".screens").removeAttribute("style"); go(state.screen||1); }
}
function resetDemo(){ state=freshState(); applyMode(); toast("Demo reset"); }

// keep the other screens in step after any action
function syncOthers(e){
  if(!OVERVIEW||!e.target.closest) return;
  const src=e.target.closest(".screen"); if(!src) return;
  const from=+src.id.slice(1);
  setTimeout(()=>{ for(let n=1;n<=6;n++) if(n!==from) renderKeep(n); updateBadge(); },0);
}
// Capture phase: read which screen was used before its handler replaces the clicked element.
document.addEventListener("click",syncOthers,true);
document.addEventListener("change",syncOthers,true);
document.addEventListener("keydown",e=>{ if(e.key==="Enter") syncOthers(e); },true);
document.addEventListener("click",e=>{
  const o=e.target.closest("[data-single]"); if(o){ userMode="single"; state.screen=+o.dataset.single; applyMode(); }
});
$("#toSingle").onclick=()=>{ userMode="single"; applyMode(); };
$("#toOverview").onclick=()=>{ userMode="overview"; applyMode(); };
$$(".js-reset").forEach(b=>b.onclick=resetDemo);
let rz; addEventListener("resize",()=>{ cancelAnimationFrame(rz); rz=requestAnimationFrame(()=>{
  const want=userMode==="overview"&&innerWidth>820; if(want!==OVERVIEW) applyMode(); else layoutOverview(); }); });

/* ============ INIT ============ */
$$("img[data-logo]").forEach(i=>i.src=LOGO);
applyMode();
// On a phone, start with the purple navigation open so every screen is one tap away.
if(!OVERVIEW) openNav();
