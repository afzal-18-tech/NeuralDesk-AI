import React from 'react';export default function MetricCard({label,value,note}){return <article className="metric"><span>{label}</span><strong>{value??'—'}</strong><small>{note}</small></article>}
