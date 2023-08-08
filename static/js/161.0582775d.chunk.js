(self.webpackChunkfhall18_github_io=self.webpackChunkfhall18_github_io||[]).push([[161],{7161:function(t,e,n){"use strict";n.r(e),n.d(e,{default:function(){return d}});n(2791);var i=n(1087),r=n(6842),s=n(7892),a=n.n(s),o=n(184),u=function(t){var e=t.data;return(0,o.jsx)("div",{className:"cell-container",children:(0,o.jsxs)("article",{className:"mini-post",children:[(0,o.jsxs)("header",{children:[(0,o.jsx)("h3",{children:(0,o.jsx)("a",{href:e.link,children:e.title})}),(0,o.jsx)("time",{className:"published",children:a()(e.date).format("MMMM, YYYY")})]}),(0,o.jsx)("a",{href:e.link,className:"image",children:(0,o.jsx)("img",{src:"".concat("").concat(e.image),alt:e.title})}),(0,o.jsx)("div",{className:"description",children:(0,o.jsx)("p",{children:e.desc})})]})})},c=[{title:"The Power Supply",subtitle:"A blog I started",link:"https://powersupply.substack.com",image:"/images/projects/powersupply.jpg",date:"2023-07-01",desc:"Realizing the fun in creative writing and the need for more people to talk about how to decarbonize their lifestyle, I decided to start blogging. All views, code and analysis are my own."},{title:"Master Equations",subtitle:"Modeling Complex Systems",link:"https://github.com/fhall18/cchpMasterEquation/tree/main",image:"/images/projects/hp_me.jpg",date:"2023-06-01",desc:"Developed master equations focused on heat pump state transfers. This enables us to understand a stable state equilibrium when solving for outdoor air temperature (Ta) and building envolope efficiency."},{title:"Gender Biases in Sports Commentary",subtitle:"Top grade in masters level class",link:"https://www.overleaf.com/read/gzqdvpbqgsrq",image:"/images/projects/cycling.jpg",date:"2022-12-01",desc:"Designed and trained a deep convolutional neural network to explore gender bias in professional sports commentating. Training used +10,000 emotional audiofiles and classified commentating from more than 100 cycling events."},{title:"Vermont Carbon Budget",subtitle:"Awarded competative RFP funding state-wide carbon study",link:"https://outside.vermont.gov/agency/anr/climatecouncil/Shared%20Documents/(10)%20Carbon%20Budget.pdf",image:"/images/projects/carbonBudget.png",date:"2022-12-01",desc:"Data scientist on a team awarded a competative RFP by the State of Vermont to build a carbon budget using data pipelines to evaluate carbon stocks and fluxes for agriculture, forestry, and other land-use historically and into the future."}],d=function(){return(0,o.jsx)(r.Z,{title:"Projects",description:"Learn about Frederick Hall's projects.",children:(0,o.jsxs)("article",{className:"post",id:"projects",children:[(0,o.jsx)("header",{children:(0,o.jsxs)("div",{className:"title",children:[(0,o.jsx)("h2",{children:(0,o.jsx)(i.rU,{to:"/projects",children:"Projects"})}),(0,o.jsx)("p",{children:"A selection of projects that I'm proud to have worked on"})]})}),c.map((function(t){return(0,o.jsx)(u,{data:t},t.title)}))]})})}},7892:function(t){t.exports=function(){"use strict";var t=1e3,e=6e4,n=36e5,i="millisecond",r="second",s="minute",a="hour",o="day",u="week",c="month",d="quarter",l="year",h="date",f="Invalid Date",m=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,p=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,g={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(t){var e=["th","st","nd","rd"],n=t%100;return"["+t+(e[(n-20)%10]||e[n]||e[0])+"]"}},$=function(t,e,n){var i=String(t);return!i||i.length>=e?t:""+Array(e+1-i.length).join(n)+t},v={s:$,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),i=Math.floor(n/60),r=n%60;return(e<=0?"+":"-")+$(i,2,"0")+":"+$(r,2,"0")},m:function t(e,n){if(e.date()<n.date())return-t(n,e);var i=12*(n.year()-e.year())+(n.month()-e.month()),r=e.clone().add(i,c),s=n-r<0,a=e.clone().add(i+(s?-1:1),c);return+(-(i+(n-r)/(s?r-a:a-r))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(t){return{M:c,y:l,w:u,d:o,D:h,h:a,m:s,s:r,ms:i,Q:d}[t]||String(t||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},y="en",M={};M[y]=g;var w=function(t){return t instanceof j},b=function t(e,n,i){var r;if(!e)return y;if("string"==typeof e){var s=e.toLowerCase();M[s]&&(r=s),n&&(M[s]=n,r=s);var a=e.split("-");if(!r&&a.length>1)return t(a[0])}else{var o=e.name;M[o]=e,r=o}return!i&&r&&(y=r),r||!i&&y},D=function(t,e){if(w(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new j(n)},S=v;S.l=b,S.i=w,S.w=function(t,e){return D(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var j=function(){function g(t){this.$L=b(t.locale,null,!0),this.parse(t)}var $=g.prototype;return $.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(S.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var i=e.match(m);if(i){var r=i[2]-1||0,s=(i[7]||"0").substring(0,3);return n?new Date(Date.UTC(i[1],r,i[3]||1,i[4]||0,i[5]||0,i[6]||0,s)):new Date(i[1],r,i[3]||1,i[4]||0,i[5]||0,i[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init()},$.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds()},$.$utils=function(){return S},$.isValid=function(){return!(this.$d.toString()===f)},$.isSame=function(t,e){var n=D(t);return this.startOf(e)<=n&&n<=this.endOf(e)},$.isAfter=function(t,e){return D(t)<this.startOf(e)},$.isBefore=function(t,e){return this.endOf(e)<D(t)},$.$g=function(t,e,n){return S.u(t)?this[e]:this.set(n,t)},$.unix=function(){return Math.floor(this.valueOf()/1e3)},$.valueOf=function(){return this.$d.getTime()},$.startOf=function(t,e){var n=this,i=!!S.u(e)||e,d=S.p(t),f=function(t,e){var r=S.w(n.$u?Date.UTC(n.$y,e,t):new Date(n.$y,e,t),n);return i?r:r.endOf(o)},m=function(t,e){return S.w(n.toDate()[t].apply(n.toDate("s"),(i?[0,0,0,0]:[23,59,59,999]).slice(e)),n)},p=this.$W,g=this.$M,$=this.$D,v="set"+(this.$u?"UTC":"");switch(d){case l:return i?f(1,0):f(31,11);case c:return i?f(1,g):f(0,g+1);case u:var y=this.$locale().weekStart||0,M=(p<y?p+7:p)-y;return f(i?$-M:$+(6-M),g);case o:case h:return m(v+"Hours",0);case a:return m(v+"Minutes",1);case s:return m(v+"Seconds",2);case r:return m(v+"Milliseconds",3);default:return this.clone()}},$.endOf=function(t){return this.startOf(t,!1)},$.$set=function(t,e){var n,u=S.p(t),d="set"+(this.$u?"UTC":""),f=(n={},n[o]=d+"Date",n[h]=d+"Date",n[c]=d+"Month",n[l]=d+"FullYear",n[a]=d+"Hours",n[s]=d+"Minutes",n[r]=d+"Seconds",n[i]=d+"Milliseconds",n)[u],m=u===o?this.$D+(e-this.$W):e;if(u===c||u===l){var p=this.clone().set(h,1);p.$d[f](m),p.init(),this.$d=p.set(h,Math.min(this.$D,p.daysInMonth())).$d}else f&&this.$d[f](m);return this.init(),this},$.set=function(t,e){return this.clone().$set(t,e)},$.get=function(t){return this[S.p(t)]()},$.add=function(i,d){var h,f=this;i=Number(i);var m=S.p(d),p=function(t){var e=D(f);return S.w(e.date(e.date()+Math.round(t*i)),f)};if(m===c)return this.set(c,this.$M+i);if(m===l)return this.set(l,this.$y+i);if(m===o)return p(1);if(m===u)return p(7);var g=(h={},h[s]=e,h[a]=n,h[r]=t,h)[m]||1,$=this.$d.getTime()+i*g;return S.w($,this)},$.subtract=function(t,e){return this.add(-1*t,e)},$.format=function(t){var e=this,n=this.$locale();if(!this.isValid())return n.invalidDate||f;var i=t||"YYYY-MM-DDTHH:mm:ssZ",r=S.z(this),s=this.$H,a=this.$m,o=this.$M,u=n.weekdays,c=n.months,d=function(t,n,r,s){return t&&(t[n]||t(e,i))||r[n].slice(0,s)},l=function(t){return S.s(s%12||12,t,"0")},h=n.meridiem||function(t,e,n){var i=t<12?"AM":"PM";return n?i.toLowerCase():i},m={YY:String(this.$y).slice(-2),YYYY:this.$y,M:o+1,MM:S.s(o+1,2,"0"),MMM:d(n.monthsShort,o,c,3),MMMM:d(c,o),D:this.$D,DD:S.s(this.$D,2,"0"),d:String(this.$W),dd:d(n.weekdaysMin,this.$W,u,2),ddd:d(n.weekdaysShort,this.$W,u,3),dddd:u[this.$W],H:String(s),HH:S.s(s,2,"0"),h:l(1),hh:l(2),a:h(s,a,!0),A:h(s,a,!1),m:String(a),mm:S.s(a,2,"0"),s:String(this.$s),ss:S.s(this.$s,2,"0"),SSS:S.s(this.$ms,3,"0"),Z:r};return i.replace(p,(function(t,e){return e||m[t]||r.replace(":","")}))},$.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},$.diff=function(i,h,f){var m,p=S.p(h),g=D(i),$=(g.utcOffset()-this.utcOffset())*e,v=this-g,y=S.m(this,g);return y=(m={},m[l]=y/12,m[c]=y,m[d]=y/3,m[u]=(v-$)/6048e5,m[o]=(v-$)/864e5,m[a]=v/n,m[s]=v/e,m[r]=v/t,m)[p]||v,f?y:S.a(y)},$.daysInMonth=function(){return this.endOf(c).$D},$.$locale=function(){return M[this.$L]},$.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),i=b(t,e,!0);return i&&(n.$L=i),n},$.clone=function(){return S.w(this.$d,this)},$.toDate=function(){return new Date(this.valueOf())},$.toJSON=function(){return this.isValid()?this.toISOString():null},$.toISOString=function(){return this.$d.toISOString()},$.toString=function(){return this.$d.toUTCString()},g}(),x=j.prototype;return D.prototype=x,[["$ms",i],["$s",r],["$m",s],["$H",a],["$W",o],["$M",c],["$y",l],["$D",h]].forEach((function(t){x[t[1]]=function(e){return this.$g(e,t[0],t[1])}})),D.extend=function(t,e){return t.$i||(t(e,j,D),t.$i=!0),D},D.locale=b,D.isDayjs=w,D.unix=function(t){return D(1e3*t)},D.en=M[y],D.Ls=M,D.p={},D}()}}]);
//# sourceMappingURL=161.0582775d.chunk.js.map