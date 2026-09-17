import React from 'react';
import {
  PJS,
  leadStages, interestStages, conversionStages
} from './CustomerTypes';
import CustomDropdown from '../shared/CustomDropdown';

interface StageSelectsProps {
  leadStage: string;
  interestStage: string;
  conversionStage: string;
  onLeadChange: (v: string) => void;
  onInterestChange: (v: string) => void;
  onConversionChange: (v: string) => void;
}

export const StageSelects: React.FC<StageSelectsProps> = ({
  leadStage,
  interestStage,
  conversionStage,
  onLeadChange,
  onInterestChange,
  onConversionChange,
}) => (
  <div style={{ borderTop: '1px solid #EAEAEA', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ ...PJS, fontSize: 13, fontWeight: 700, color: '#16281D' }}>Customer Progress Stages</div>
    <div>
      <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        Lead Stage
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700 }}>Initial</span>
      </label>
      <CustomDropdown
        value={leadStage}
        onChange={onLeadChange}
        options={leadStages.map(s => ({ value: s, label: s }))}
        className="w-full"
      />
    </div>
    <div>
      <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        Interest Stage
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: '#FEF3C7', color: '#B45309', fontWeight: 700 }}>Optional</span>
      </label>
      <CustomDropdown
        value={interestStage}
        onChange={onInterestChange}
        disabled={leadStage === 'New Lead'}
        options={[
          { value: '', label: 'No interest stage' },
          ...interestStages.map(s => ({ value: s, label: s }))
        ]}
        placeholder="No interest stage"
        className="w-full"
      />
    </div>
    <div>
      <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        Conversion Stage
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>Optional</span>
      </label>
      <CustomDropdown
        value={conversionStage}
        onChange={onConversionChange}
        disabled={!interestStage}
        options={[
          { value: '', label: 'No conversion stage' },
          ...conversionStages.map(s => ({ value: s, label: s }))
        ]}
        placeholder="No conversion stage"
        className="w-full"
      />
    </div>
  </div>
);

export default StageSelects;
