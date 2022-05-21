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
    };
    window.shuffle = shuffle;
    
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
    };
    window.combine = combine;
    
    class c_test_route {
        
        constructor(seq) {
            this.sslms = c_sslms.map(c => new c(true, true));
            this.tseq = seq;
            this.tidx = 0;
            this.nid = 0;
        }
        
        set(vset) {
            let sslms = this.sslms;
            for(let sslm of sslms) {
                let nid = ++this.nid;
                sslm.set(vset, nid);
            }
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
            if(!eq) {
                throw Error('conflict');
            }
        }
        
        match() {
            let tseq = this.tseq;
            let sslms = this.sslms;
            for(let tset of tseq) {
                let lst_minfo = null;
                let lst_r_minfo = null;
                for(let sslm of sslms) {
                    let minfo = sslm.match(tset, false);
                    this.minfo_cmp(minfo, lst_minfo);
                    lst_minfo = minfo;
                    minfo = sslm.match(tset, true);
                    this.minfo_cmp(minfo, lst_r_minfo);
                    lst_r_minfo = minfo;
                }
            }
        }
        
        step() {
            let tset = this.tseq[this.tidx++];
            this.set(tset);
            this.match();
        }
        
    }
    
    return n => {
        
    };
    
})();
