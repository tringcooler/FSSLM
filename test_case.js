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
    
    class c_test_route {
        
        constructor(tseq, qseq) {
            this.sslms = c_sslms.map(c => new c(true, true));
            this.tseq = tseq;
            this.qseq = qseq;
            this.stat = {};
            this.nid = 0;
        }
        
        set(vset) {
            let sslms = this.sslms;
            for(let sslm of sslms) {
                let nid = ++this.nid;
                sslm.set(vset, nid);
            }
        }
        
        raise_conflict() {
            window.conflict_route = this;
            throw Error('conflict: detail in conflict_route');
        }
        
        minfo_cmp(m1, m2) {
            let eq = (m1.found === m2.found
                && m1.unmatch === m2.unmatch
                && m1.matches.length === m2.matches.length);
            if(eq) {
                let mlen = m1.matches.length;
                for(let i = 0; i < mlen; i++) {
                    if(m1[i] !== m2[i]) {
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
                for(let sslm of sslms) {
                    let minfo = sslm.match(tset, false);
                    if(!this.minfo_cmp(minfo, lst_minfo)) {
                        this.raise_conflict();
                    }
                    lst_minfo = minfo;
                    minfo = sslm.match(tset, true);
                    if(!this.minfo_cmp(minfo, lst_r_minfo)) {
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
                yield tset;
            }
        }
        
    }
    
    const asleep = ms => new Promise(resolve => {
        setTimeout(resolve, ms);
    });
    
    class c_breakable {
        
        constructor() {
            this.to_break = false;
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
        console.log(`test start for ${n} elments. ctrl + c to break.`);
        let idx = 0;
        while(true) {
            console.log(`route ${++idx}`);
            let route = new c_test_route(randpick(comb_seq), comb_seq);
            for(let _ of route.step()) {
                //console.log('.');
            }
            if(await G_BREAK.check()) {
                break;
            }
        }
        console.log('break');
    };
    
})();
