const TEST_CASE = ((...c_sslms) => {

    function *shuffle(src) {
        let slen = src.length;
        if(slen <= 1) {
            yield src;
            return;
        }
        for(let i = 0; i < slen; i++) {
            let hd = src[i];
            let tl = src.slice();
            tl.splice(i, 1);
            for(let stl of shuffle(tl)) {
                // faster than [hd].concat(stl)
                yield stl.concat([hd]);
            }
        }
    }
    
    function *combine(src) {
        let slen = src.length;
        if(slen < 1) {
            yield src;
            return;
        }
        let [hd, ...tl] = src;
        for(let stl of combine(tl)) {
            yield stl;
            yield stl.concat([hd]);
        }
    }
    
    function *randseq(n, mn, mx) {
        let nmx = mx - n + 1;
        let r = Math.floor(Math.random() * (nmx - mn + 1) + mn);
        yield r;
        if(n > 1) {
            yield *randseq(n - 1, r + 1, mx);
        }
    }
    
    function *randpick(src) {
        let seq = src.slice();
        let slen;
        while((slen = seq.length) > 0) {
            let r = Math.floor(Math.random() * slen);
            yield seq[r];
            seq.splice(r, 1);
        }
    }
    
    const G_SHF_VRV = new VRV((function*() {
        let i = 2;
        while(true) {
            yield i++;
        }
    })());
    
    function *vidpick(src, vid) {
        let vec = G_SHF_VRV.vid2vec(vid);
        let vlen = vec.length;
        let seq = src.slice();
        while((slen = seq.length) > 0) {
            let r = 0;
            if(slen <= vlen + 1 && slen > 1) {
                r = vec[vlen + 1 - slen];
            }
            yield seq[r];
            seq.splice(r, 1);
        }
    }
    
    class c_timer2 {
        
        constructor() {
            this.unit_ts = null;
            this.new_arr1();
            this.new_arr2();
        }
        
        new_arr1() {
            this.arr1 = {
                E: 0,
                E2: 0,
                D: 0,
                n: 0,
            };
        }
        
        new_arr2() {
            this.arr2 = {
                E: 0,
                E2: 0,
                D: 0,
                DE: 0,
                ED: 0,
                n: 0,
            }
        }
        
        time_start() {
            this.unit_ts = performance.now();
        }
        
        time_stop() {
            if(!this.unit_ts) return;
            let t = performance.now() - this.unit_ts;
            this.unit_ts = null;
            this.rec_unit(t);
        }
        
        rec_unit(x) {
            let arr = this.arr1;
            let n = arr.n++;
            arr.E = (n * arr.E + x) / (n + 1);
            arr.E2 = (n * arr.E2 + x * x) / (n + 1);
            arr.D = arr.E2 - arr.E * arr.E;
        }
        
        arr1_done() {
            let arr = this.arr1;
            let mat = this.arr2;
            let m = mat.n++;
            mat.E = (m * mat.E + arr.E) / (m + 1);
            mat.E2 = (m * mat.E2 + arr.E2) / (m + 1);
            mat.D = mat.E2 - mat.E * mat.E;
            mat.ED = (m * mat.ED + arr.D) / (m + 1);
            mat.DE = mat.D - mat.ED;
            this.new_arr1();
        }
        
    }
    
    const _t1000fix3 = v => (v * 1000).toFixed(3);
    
    class c_test_route {
        
        constructor(tseq, qseq) {
            this.sslms = c_sslms.map(c => new c(true, true));
            this.timers = c_sslms.map(c => ({
                set: new c_timer2(),
                match: new c_timer2(),
                matchr: new c_timer2(),
            }));
            this.ndset = {};
            this.tseq = tseq;
            this.qseq = qseq;
            this.stat = {};
            this.nid = 0;
        }
        
        kick_timers() {
            for(let {set, match, matchr} of this.timers) {
                set.arr1_done();
                match.arr1_done();
                matchr.arr1_done();
            }
        }
        
        repr_timers() {
            let r = '';
            let timers = this.timers;
            for(let i = 0; i < timers.length; i++) {
                let tms = timers[i];
                r += `  sslm ${i}:\n`
                for(let k in tms) {
                    let tm = tms[k];
                    r += `    ${k}:\tE:${_t1000fix3(tm.arr2.E)}ns D:${_t1000fix3(tm.arr2.D)}ns ED:${_t1000fix3(tm.arr2.ED)}ns DE:${_t1000fix3(tm.arr2.DE)}ns\n`;
                }
            }
            return r;
        }
        
        set(vset) {
            let sslms = this.sslms;
            let nid = ++this.nid;
            let sslen = sslms.length;
            for(let i = 0; i < sslen; i++) {
                let sslm = sslms[i];
                this.timers[i].set.time_start();
                sslm.set(vset, nid);
                this.timers[i].set.time_stop();
            }
            this.ndset[nid] = vset;
        }
        
        updrslt_nid2ndset(minfo) {
            let ndset = [];
            for(let nid of minfo.matches) {
                ndset.push(this.ndset[nid]);
            }
            minfo.nodes = ndset;
        }
        
        raise_conflict() {
            this.updrslt_nid2ndset(this.stat.match.result);
            this.updrslt_nid2ndset(this.stat.match.last_result);
            window.conflict_route = this;
            throw Error('conflict: detail in conflict_route');
        }
        
        minfo_cmp(m1, m2) {
            let eq = (m1.found === m2.found
                && m1.unmatch === m2.unmatch
                && m1.matches.length === m2.matches.length);
            if(eq) {
                let mlen = m1.matches.length;
                let mtc1 = m1.matches.sort();
                let mtc2 = m2.matches.sort();
                for(let i = 0; i < mlen; i++) {
                    if(mtc1[i] !== mtc2[i]) {
                        eq = false;
                        break;
                    }
                }
            }
            return eq;
        }
        
        match() {
            let qseq = this.qseq;
            let sslms = this.sslms;
            for(let tset of qseq) {
                this.stat.query_set = tset;
                let lst_minfo = null;
                let lst_r_minfo = null;
                let sslen = sslms.length;
                for(let i = 0; i < sslen; i++) {
                    let sslm = sslms[i];
                    let match_stat = {};
                    this.stat.match = match_stat;
                    match_stat.idx = i;
                    match_stat.rvs = false;
                    this.timers[i].match.time_start();
                    let minfo = sslm.match(tset, false);
                    this.timers[i].match.time_stop();
                    match_stat.result = minfo;
                    if(lst_minfo && !this.minfo_cmp(minfo, lst_minfo)) {
                        match_stat.last_result = lst_minfo;
                        this.raise_conflict();
                    }
                    lst_minfo = minfo;
                    match_stat.rvs = true;
                    this.timers[i].matchr.time_start();
                    minfo = sslm.match(tset, true);
                    this.timers[i].matchr.time_stop();
                    match_stat.result = minfo;
                    if(lst_r_minfo && !this.minfo_cmp(minfo, lst_r_minfo)) {
                        match_stat.last_result = lst_r_minfo;
                        this.raise_conflict();
                    }
                    lst_r_minfo = minfo;
                }
            }
        }
        
        *step() {
            let tseq = this.tseq;
            for(let tset of tseq) {
                this.stat.test_set = tset;
                this.set(tset);
                this.match();
                this.kick_timers();
                yield tset;
            }
        }
        
    }
    
    const asleep = ms => new Promise(resolve => {
        setTimeout(resolve, ms);
    });
    
    class c_breakable {
        
        constructor(space_ms = 1000) {
            this.to_break = false;
            this.space_t = 1000;
            this.last_ts = 0;
            this.hook();
        }
        
        hook() {
            window.addEventListener('keydown', event => {
                if (event.ctrlKey && event.code === 'KeyC') {
                    this.to_break = true
                }
            });
        }
        
        async check(t = 0) {
            let ts = Date.now();
            if(ts - this.last_ts < this.space_t) {
                return false;
            }
            this.last_ts = ts;
            await asleep(t);
            if(this.to_break) {
                this.to_break = false;
                return true;
            }
            return false;
        }
        
    }
    const G_BREAK = new c_breakable();
    
    return async n => {
        let all_set = [...Array(n)].map((v, i) => i + 1);
        let comb_seq = [];
        for(let s of combine(all_set)) {
            if(s.length === 0) continue;
            comb_seq.push(s);
        }
        let clen = comb_seq.length;
        let shflen = 1;
        for(let i = 2; i <= clen; i++) {
            shflen *= i;
            if(shflen > Number.MAX_SAFE_INTEGER) {
                shflen = 'many';
                break;
            }
        }
        console.log(`test start for ${n} elments ${clen} sets ${shflen} shuffle. ctrl + c to break.`);
        let idx = 0;
        while(true) {
            let tst_seq;
            if(isNaN(shflen)) {
                console.log(`route ${++idx}`);
                tst_seq = randpick(comb_seq);
            } else {
                let rand_vid = Math.floor(Math.random() * shflen);
                console.log(`route ${++idx}: ${rand_vid}`);
                tst_seq = vidpick(comb_seq, rand_vid);
            }
            let route = new c_test_route(tst_seq, comb_seq);
            let is_break = false;
            for(let _ of route.step()) {
                if(await G_BREAK.check()) {
                    is_break = true;
                    break;
                }
            }
            console.log(route.repr_timers());
            if(is_break) {
                break;
            }
        }
        console.log('break');
    };
    
});
