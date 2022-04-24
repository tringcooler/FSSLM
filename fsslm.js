const FSSLM = (()=> {
    
    const [
    
        PL_MA_SRC, PL_MA_MSK,
        PR_MA_I0, PR_MA_I1,
    
        PR_N_VSET,
        FLG_N_VALID,
        
        KEY_K_LOOPBACK,
    
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    class c_masked_arr {
            
        constructor(src) {
            this[PL_MA_SRC] = src;
            if(src.length > 52) {
                this[PR_MA_I0] = 0n;
                this[PR_MA_I1] = 1n;
            } else {
                this[PR_MA_I0] = 0;
                this[PR_MA_I1] = 1;
            }
            this[PL_MA_MSK] = this[PR_MA_I0];
        }
        
        *coiter() {
            let src = this[PL_MA_SRC];
            let msk = this[PL_MA_MSK];
            let v0 = this[PR_MA_I0];
            let v1 = this[PR_MA_I1];
            for(let i = v0; i < src.length; i++) {
                let m = ((msk >> i) & v1);
                if(m) continue;
                let v = src[i];
                let comsk = (msk | (v1 << i));
                let coarr = new c_masked_arr(src);
                coarr[PL_MA_MSK] = comsk;
                yield [v, coarr];
            }
        }
        
    }
    
    const meta_fsslm = (mapops) => {
        
        class c_ss_node {
            
            constructor(vset, valid) {
                this[PR_N_VSET] = new set(vset);
                this[FLG_N_VALID] = valid;
                this[PL_N_NXT] = mapops.new();
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_N_NXT], v);
                return nxt ?? null;
            }
            
        }
        
        class c_ss_walker {
            
            constructor(start, varr) {
                this[PL_W_CUR] = [[start, varr]];
                this[PL_W_END] = [];
                this[PL_W_WLK] = new Set();
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
            
            get done() {
                return this[PL_W_CUR].length === 0;
            }
            
        }
        
        class c_ss_walker_fast extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, [...vset]);
            }
            
            step() {
                let cseq = this[PL_W_CUR];
                let [nd, varr] = cseq[0];
                if(varr.length === 0) {
                    cseq.shift();
                    this[MTD_W_RET](nd, true);
                    return;
                }
                let v = varr.pop();
                let nxt = nd.next(v);
                if(nxt === KEY_K_LOOPBACK) {
                    return;
                } else if(nxt) {
                    cseq[0] = [nxt, varr];
                } else {
                    cseq.shift();
                    this[MTD_W_RET](null, false);
                }
            }
            
        }
        
        class c_ss_walker_full extends c_ss_walker {
            
            constructor(start, vset) {
                super(start, new c_masked_arr([...vset]));
            }
            
            [MTD_W_STRIP_VARR](nd, varr) {
                let looped = [],
                    hit = [],
                    missed = [];
                for(let [v, co] of varr.coiter()) {
                    let nxt = nd.next(v);
                    if(nxt === KEY_K_LOOPBACK) {
                        looped.push([v, co]);
                    } else if(nxt) {
                        hit.push([v, co, nxt]);
                    } else {
                        missed.push([v, co]);
                    }
                }
                return [looped, hit, missed];
            }
            
            step_full() {
                let [nd, varr] = this[PL_W_CUR].shift();
                let [lvarr, nvarr, evarr] = this[MTD_W_STRIP_VSET](nd, varr);
                
                
                for(let v of setops.iter(vset)) {
                    let cv = setops.coset(vset, v);
                    let nxt = nd.next(v);
                    if(nxt) {
                        if(!this[PL_W_WLK].has(nxt)) {
                            this[PL_W_CUR].push([nxt, cv]);
                        }
                        has_nxt = true;
                    }
                    if(uniq) {
                        break;
                    }
                }
                if(!has_nxt) {
                    this[PL_W_END].push([nd, vset]);
                }
                this[PL_W_WLK].add(nd);
            }
            
            walk() {
                while(!this.done) {
                    this.step();
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
