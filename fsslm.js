const FSSLM = (()=> {
    
    const [
    
        PR_N_VSET,
        FLG_N_VALID,
    
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    const meta_fsslm = (setops, mapops) => {
        
        class c_ss_node {
            
            constructor(vset, valid) {
                this[PR_N_VSET] = setops.new(vset);
                this[FLG_N_VALID] = valid;
                this[PL_N_NXT] = mapops.new();
            }
            
            next(v) {
                let nxt = mapops.get(this[PL_N_NXT], v);
                return nxt ?? null;
            }
            
        }
        
        class c_ss_walker {
            
            constructor(start, vset, uniq) {
                this[PL_W_CUR] = [[start, setops.new(vset)]];
                this[PL_W_END] = [];
                this[PL_W_WLK] = new Set();
                this[FLG_W_UNIQ] = uniq;
            }
            
            get done() {
                return this[PL_W_CUR].length === 0;
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
