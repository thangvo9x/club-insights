import { displayDate } from '../lib/dates';
import type { Insights, Metric } from '../types';
import { METRICS } from './metric-card';

export function WeeklyChart({
  weeks,
  metric,
}: {
  weeks: Insights['weeks'];
  metric: Metric;
}) {
  const values = weeks.map((w) => w[metric]);
  const maximum = Math.max(4, ...values.map((v) => v ?? 0));
  const ceiling = Math.ceil(maximum / 4) * 4;
  return (
    <div className="chart-container">
      <div
        className="chart-grid"
        role="img"
        aria-label={`${METRICS[metric].label} by Monday–Sunday weeks. Values are available in the table below.`}
      >
        <div className="y-axis">
          {[ceiling, ceiling * 0.75, ceiling * 0.5, ceiling * 0.25, 0].map(
            (n) => (
              <span key={n}>{n}</span>
            ),
          )}
        </div>
        <div className="plot-area">
          <div className="grid-lines">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} />
            ))}
          </div>
          <div
            className="bars"
            style={{
              minWidth: weeks.length > 12 ? weeks.length * 48 : undefined,
            }}
          >
            {weeks.map((w, index) => {
              const value = w[metric];
              const unknown = value === null;
              return (
                <div className="bar-column" key={w.start}>
                  <span className="bar-value">{unknown ? '?' : value}</span>
                  <div
                    className={`bar ${unknown ? 'unknown' : ''} ${index === weeks.length - 1 ? 'last' : ''}`}
                    style={{
                      height: unknown
                        ? 36
                        : `${Math.max(2, (value! / ceiling) * 190)}px`,
                    }}
                    title={`${displayDate(w.start)} – ${displayDate(w.end)}: ${unknown ? 'Unknown' : value}${w.partial ? ' (partial week)' : ''}`}
                  />
                  <span className="bar-label">
                    {displayDate(w.start)}
                    {w.partial && <small>Partial week</small>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div className="table-scroll">
          <table>
            <caption>
              Weekly {METRICS[metric].label.toLowerCase()} within the selected
              range
            </caption>
            <thead>
              <tr>
                <th>Week (Mon–Sun)</th>
                <th>Included days</th>
                <th>{METRICS[metric].label}</th>
                {metric === 'noShows' && <th>Unknown bookings</th>}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td>
                    {displayDate(w.start)} – {displayDate(w.end)}
                  </td>
                  <td>{w.partial ? 'Partial week' : 'Full week'}</td>
                  <td>{w[metric] ?? 'Unknown'}</td>
                  {metric === 'noShows' && <td>{w.unknownBookings}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
