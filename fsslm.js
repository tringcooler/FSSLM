const FSSLM = (()=> {
    
    const [
    
        PR_N_VSET,
        FLG_N_VALID,
        
        KEY_K_LOOPBACK,
    
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
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
            
            constructor(start, vset, mode = 'fast') {
                this[PL_W_CUR] = [[start, [...vset]]];
                this[PL_W_END] = [];
                this[PL_W_WLK] = new Set();
                this[MTD_W_INIT_STEP](mode);
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
            
            [MTD_W_INIT_STEP](mode) {
                let smname = 'step_' + mode;
                let mtd;
                if(this[smname] instanceof Function) {
                    mtd = this[smname];
                } else {
                    mtd = this.step_fast;
                }
                this.step = mtd;
            }
            
            get done() {
                return this[PL_W_CUR].length === 0;
            }
            
            step_fast() {
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
            
            [MTD_W_STRIP_VSET](nd, varr) {
                let nvarr = [],
                    evarr = [];
                for(let v of varr) {
                    let nxt = nd.next(v);
                    if(nxt === KEY_K_LOOPBACK) {
                        continue;
                    } else if(nxt) {
                        nvarr.push(v);
                    } else {
                        evarr.push(v);
                    }
                }
                return [nvarr, evarr];
            }
            
            step() {
                let [nd, vset] = this[PL_W_CUR].shift();
                let uniq = this[FLG_W_UNIQ];
                let has_nxt = false;
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
    
    return {};
    
})();
