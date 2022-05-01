const FSSLM = (()=> {
    
    const [
    
        PL_MA_SRC, PR_MA_MSK, PR_MA_LEN,
        MTD_MA_INT,
    
        PR_N_VSET,
        FLG_N_VALID,
        
        KEY_K_LOOPBACK,
    
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    const sparse_popcnt = (v, v1 = 1) => {
        let c = 0;
        while(v) {
            v &= v - v1;
            c ++;
        }
        return c
    };
    
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
        
    }
    
    const meta_fsslm = (mapops) => {
        
        class c_ss_node {
            
            constructor(vset) {
                this[PR_N_VSET] = new set(vset);
                this[PL_N_NXT] = mapops.new();
                this[FLG_N_VALID] = false;
            }
            
            get length() {
                return mapops.size(this[PL_N_NXT]);
            }
            
            get valid() {
                return this[FLG_N_VALID];
            }
            
            reg() {
                this[FLG_N_VALID] || (this[FLG_N_VALID] = true);
                return this;
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_N_NXT], v);
                return nxt ?? null;
            }
            
        }
        
        class c_ss_walker {
            
            constructor(start, varr) {
                this[PL_W_CUR] = [[start, varr, null, null, 0]];
            }
            
            get done() {
                return this[PL_W_CUR].length === 0;
            }
            
            walk() {
                while(!this.done) {
                    this.step();
                }
            }
            
        }
        
        class c_ss_walker_get extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, [...vset]);
                this[MTD_W_INIT_STAT]();
            }
            
            [MTD_W_INIT_STAT]() {
                this[PL_W_STAT] = {
                    match: null,
                    cmplt: false,
                };
            }
            
            [MTD_W_RET](match, cmplt) {
                //assert(this.done);
                let s = this[PL_W_STAT];
                s.match = match;
                s.cmplt = cmplt;
            }
            
            step() {
                let cseq = this[PL_W_CUR];
                let [nd, varr, pnd, pkv, wcnt] = cseq[0];
                if(varr.length === 0) {
                    cseq.shift();
                    this[MTD_W_RET](nd, true);
                    return;
                }
                let v = varr.pop();
                let nxt = nd.next(v);
                if(nxt === KEY_K_LOOPBACK) {
                    cseq[0][4] ++;
                    return;
                } else if(nxt) {
                    cseq[0] = [nxt, varr, nd, v, wcnt + 1];
                } else {
                    cseq.shift();
                    this[MTD_W_RET](null, false);
                }
            }
            
        }
        
        class c_ss_walker_add extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, new c_masked_arr([...vset]));
                this[PL_W_NDINFO] = new Map();
            }
            
            [MTD_W_STRIP_VARR](nd, varr) {
                let rvarr = varr.clone();
                let cnt_looped = 0,
                    cnt_hit = 0,
                    cnt_missed = 0;
                for(let [v, co] of varr.coiter()) {
                    let nxt = nd.next(v);
                    if(nxt === KEY_K_LOOPBACK) {
                        cnt_looped ++;
                        rvarr.merge(co);
                    } else if(nxt) {
                        cnt_hit ++;
                    } else {
                        cnt_missed ++;
                    }
                }
                return [rvarr, cnt_looped, cnt_hit, cnt_missed];
            }
            
            [MTD_W_PARSE_NODE_INFO](nd, varr) {
                let ndinfo = {};
                let [strp_varr, cnt_looped, cnt_hit, cnt_missed] = this[MTD_W_STRIP_VSET](nd, varr);
                //assert(strp_varr.length === cnt_hit + cnt_missed);
                let strp_wcnt = wcnt + cnt_looped;
                //assert(nd.length >= strp_wcnt);
                //assert(strp_wcnt > 0 || strp_wcnt === nd.length === 0);
                ndinfo.qless = (nd.length > strp_wcnt);
                ndinfo.qmore = (cnt_hit + cnt_missed > 0);
                ndinfo.varr = strp_varr;
                ndinfo.wcnt = strp_wcnt;
                ndinfo.walked = false;
                return ndinfo;
            }
            
            [MTD_W_GET_NODE_INFO](nd, varr) {
                let nds = this[PL_W_NDINFO];
                let ndinfo = nds.get(nd);
                if(!ndinfo) {
                    ndinfo = this[MTD_W_PARSE_NODE](nd, varr);
                    nds.set(nd, ndinfo);
                }
                return ndinfo;
            }
            
            [MTD_W_INSERT_NODE](nnd, pnd, pkv, next_varr) {
                let wlk_varr = next_varr.clone().inverse();
            }
            
            [MTD_W_APPEND_NODE](nd, kv, next_varr) {
                
            }
            
            step() {
                let [nd, varr, pnd, pkv, wcnt] = this[PL_W_CUR].shift();
                let ndinfo = this[MTD_W_GET_NODE_INFO](nd, varr);
                let strp_varr = ndinfo.varr;
                if(ndinfo.qless) {
                    this[MTD_W_INSERT_NODE](nd, pnd, pkv, strp_varr);
                    if(!ndinfo.qmore) {
                        // q < n
                        return;
                    }
                    //q ^ n
                } else {
                    if(!ndinfo.qmore) {
                        // q == n
                        nd.reg();
                        return;
                    }
                    // q > n
                }
                if(ndinfo.walked) {
                    return;
                }
                ndinfo.walked = true;
                let strp_wcnt = ndinfo.wcnt;
                for(let [v, co] of strp_varr.coiter()) {
                    let nxt = nd.next(v);
                    //assert(nxt !== KEY_K_LOOPBACK);
                    if(nxt) {
                        
                    } else {
                        // missed
                        nxt = this[MTD_W_APPEND_NODE](nd, v, co);
                    }
                    this[PL_W_CUR].push([
                        nxt, co, nd, v, strp_wcnt + 1,
                    ]);
                }
            }
            
        }
        
        class c_ss_graph {
            
            constructor() {
                this[PR_G_ROOT] = new c_ss_node(null, false);
            }
            
        }
        
        return c_ss_graph;
        
    };
    
    return {
        ma: c_masked_arr,
    };
    
})();
