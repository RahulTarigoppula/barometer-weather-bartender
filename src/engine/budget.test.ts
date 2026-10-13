import { describe, expect, it } from 'vitest';
import { DRINKS } from '../test/helpers';
import { budgetPlan, fmtDollars, fmtRupees, TIER_LABEL, TIERS } from './budget';

const byId = (id: string) => {
  const d = DRINKS.find((x) => x.id === id);
  if (!d) throw new Error(id);
  return d;
};

describe('budget tiers', () => {
  it('has the four tiers in order', () => {
    expect(TIERS.map((t) => TIER_LABEL[t])).toEqual(['Extreme Cheap', 'Budget', 'Mid-range', 'High-end']);
  });

  it('every drink has a plan at every tier, and prices rise with the tier', () => {
    for (const d of DRINKS) {
      let prevHigh = 0;
      for (const t of TIERS) {
        const p = budgetPlan(d, t);
        expect(p.pour.length, `${d.id} ${t}`).toBeGreaterThan(3);
        expect(p.where.length).toBeGreaterThan(3);
        expect(p.low).toBeLessThan(p.high);
        expect(p.high).toBeGreaterThan(prevHigh);
        expect(p.low % 10).toBe(0);
        prevHigh = p.high;
      }
    }
  });

  it('a Mojito at Extreme Cheap is Old Monk at home; High-end is a premium bar', () => {
    const cheap = budgetPlan(byId('mojito'), 'cheap');
    expect(cheap.pour).toMatch(/Old Monk/);
    expect(cheap.where).toMatch(/home/);
    expect([cheap.low, cheap.high]).toEqual([60, 150]);
    expect(budgetPlan(byId('mojito'), 'high').where).toMatch(/five-star/);
  });

  it('alcohol-free drinks are cheaper than their cocktail twins', () => {
    const a = budgetPlan(byId('mojito'), 'mid');
    const b = budgetPlan(byId('virgin-mojito'), 'mid');
    expect(b.high).toBeLessThan(a.high);
  });

  it('beer is cheaper and tequila dearer than rum', () => {
    expect(budgetPlan(byId('michelada'), 'budget').high).toBeLessThan(budgetPlan(byId('mojito'), 'budget').high);
    expect(budgetPlan(byId('margarita'), 'budget').high).toBeGreaterThan(budgetPlan(byId('mojito'), 'budget').high);
  });

  it('formats rupees with Indian grouping and a dollar hint', () => {
    expect(fmtRupees(950, 2500)).toBe('₹950–₹2,500');
    expect(fmtRupees(120000, 150000)).toBe('₹1,20,000–₹1,50,000');
    expect(fmtDollars(180, 350)).toBe('≈ $2–$4');
  });
});
