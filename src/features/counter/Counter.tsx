import type { ReactElement } from 'react';
import { openDrawer } from '../../app/route';
import { useBar } from '../../state/store';
import { Register } from '../register/Register';
import { Search, WhereAmI } from '../search/Search';
import { RecentRounds } from '../tab/RecentRounds';

/** Band 3: the mahogany counter with its 9 px lip, the classified ad, the register and THE TAB plate. */
export function Counter(): ReactElement {
  const restock = useBar((s) => s.restock);
  const online = useBar((s) => s.online);
  return (
    <section className="counter grain" aria-label="Counter">
      <div className="counter__row">
        <div className="counter__left">
          <Search />
          <div className="counter__buttons">
            <WhereAmI />
            <button type="button" className="plate" onClick={() => openDrawer('tab')}>
              The Tab
            </button>
          </div>
          <div className="counter__tags">
            {!online && (
              <span className="tag-brass" role="status">
                <b>No signal</b> Serving from the Tab. New pours need the internet.
              </span>
            )}
            {restock && (
              <button type="button" className="tag-brass" onClick={restock}>
                <b>Brass tag</b> New bottles in stock. Restock?
              </button>
            )}
          </div>
          <RecentRounds />
        </div>
        <Register />
      </div>
      <div className="counter__foot" aria-hidden="true" />
    </section>
  );
}
