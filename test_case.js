const TEST_CASE = ((...c_sslms) => {
    
    const [
        PL_MA_SRC, PR_MA_MSK, PR_MA_LEN,
        MTD_MA_INT,
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    class c_masked_arr {
            
        constructor(src) {
            this[PL_MA_SRC] = src;
            this[PR_MA_MSK] = this[MTD_MA_INT](0);
            this[PR_MA_LEN] = src.length;
        }
        
        clone() {
            let r = new c_masked_arr(this[PL_MA_SRC]);
            r[PR_MA_MSK] = this[PR_MA_MSK];
            r[PR_MA_LEN] = this[PR_MA_LEN];
            return r;
        }
        
        get length() {
            return this[PR_MA_LEN];
        }
        
        get src() {
            return this[PL_MA_SRC];
        }
        
        [MTD_MA_INT](v) {
            if(this[PL_MA_SRC].length > 52) {
                return BigInt(v);
            } else {
                return v;
            }
        }
        
        *coiter() {
            let src = this[PL_MA_SRC];
            let msk = this[PR_MA_MSK];
            let v0 = this[MTD_MA_INT](0);
            let v1 = this[MTD_MA_INT](1);
            for(let i = v0; i < src.length; i++) {
                let m = ((msk >> i) & v1);
                if(m) continue;
                let v = src[i];
                let comsk = (msk | (v1 << i));
                let coarr = new c_masked_arr(src);
                coarr[PR_MA_MSK] = comsk;
                coarr[PR_MA_LEN] = this[PR_MA_LEN] - 1;
                yield [v, coarr];
            }
        }
        
        *[Symbol.iterator]() {
            for(let [v, _] of this.coiter()) {
                yield v;
            }
        }
        
        merge(dst) {
            let src = this[PL_MA_SRC];
            if(src !== dst[PL_MA_SRC]) {
                throw Error('merge with different sources');
            }
            let smsk = this[PR_MA_MSK];
            let dmsk = dst[PR_MA_MSK];
            this[PR_MA_MSK] = (smsk | dmsk);
            this[PR_MA_LEN] -= sparse_popcnt(~smsk & dmsk, this[MTD_MA_INT](1));
            return this;
        }
        
        inverse() {
            let v1 = this[MTD_MA_INT](1);
            let slen = this[PL_MA_SRC].length;
            this[PR_MA_MSK] = ~this[PR_MA_MSK] & ((v1 << this[MTD_MA_INT](slen)) - v1);
            this[PR_MA_LEN] = slen - this[PR_MA_LEN];
            return this;
        }
        
        empty() {
            let v1 = this[MTD_MA_INT](1);
            let slen = this[PL_MA_SRC].length;
            this[PR_MA_MSK] = (v1 << this[MTD_MA_INT](slen)) - v1;
            this[PR_MA_LEN] = 0;
            return this;
        }
        
    }

    function *shuffle(src) {
        if(src.length < 1) {
            yield [];
            return;
        }
        for(let [hd, tl] of src.coiter()) {
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
            yield [];
            return;
        }
        let [hd, ...tl] = src;
        for(let stl of combine(tl)) {
            yield stl;
            yield stl.concat([hd]);
        }
    };
    window.combine = combine;
    
    window.test1 = (arr) => {
        let c = new c_masked_arr([...combine(arr)]);
        let cnt = 0;
        for(let itm of shuffle(c)) {
            cnt++;
        }
        return cnt;
    }
    
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
