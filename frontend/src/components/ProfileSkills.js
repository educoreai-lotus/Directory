// Component - Profile Skills Section
// Displays employee skills from Skills Engine in a hierarchical tree view

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployeeSkills } from '../services/employeeService';

function ProfileSkills({ employeeId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skillsData, setSkillsData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    const fetchSkills = async () => {
      if (!user?.companyId || !employeeId) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log('[ProfileSkills] Fetching skills from Skills Engine via Coordinator...');
        console.log('[ProfileSkills] This may take a moment as Skills Engine processes the data.');
        
        // Call Skills Engine via Coordinator (no timeout - let it complete)
        const response = await getEmployeeSkills(user.companyId, employeeId);
        
        console.log('[ProfileSkills] ===== SKILLS ENGINE RESPONSE =====');
        console.log('[ProfileSkills] Raw response:', JSON.stringify(response, null, 2));
        // Handle envelope structure: { requester_service: 'directory_service', response: { success: true, skills: {...} } }
        // The middleware wraps the controller response, so we need response.response.skills
        const skills = response?.response?.skills || response?.skills || response?.response || response;
        console.log('[ProfileSkills] Extracted skills:', JSON.stringify(skills, null, 2));
        console.log('[ProfileSkills] Skills summary:', {
          competencies_count: skills?.competencies?.length || 0,
          relevance_score: skills?.relevance_score,
          has_gap: !!skills?.gap,
          user_id: skills?.user_id
        });
        console.log('[ProfileSkills] ===== END SKILLS ENGINE RESPONSE =====');
        setSkillsData(skills);
      } catch (err) {
        console.error('[ProfileSkills] Error fetching skills:', err);
        // If profile not approved, show appropriate message
        if (err.response?.status === 403) {
          setError('Your profile must be approved by HR to view skills.');
        } else {
          // Show error but don't use mock data - user wants to test real flow
          setError(err.response?.data?.error || err.message || 'Failed to load skills from Skills Engine. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [employeeId, user?.companyId]);

  // Generate unique key for each node based on path
  const getNodeKey = (path) => path.join('|');

  // Toggle expand/collapse for a node
  const toggleNode = (path) => {
    const key = getNodeKey(path);
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Check if node is expanded
  const isExpanded = (path) => {
    return expandedNodes.has(getNodeKey(path));
  };

  // Check if node has children (nested_competencies, skills, or children)
  const hasChildren = (node) => {
    return (node.nested_competencies && node.nested_competencies.length > 0) ||
           (node.skills && node.skills.length > 0) ||
           (node.children && node.children.length > 0);
  };

  // Render a single tree node
  const renderTreeNode = (node, path = [], level = 0) => {
    const nodeKey = getNodeKey(path);
    const hasChildrenNodes = hasChildren(node);
    const isNodeExpanded = isExpanded(path);
    const indentLevel = level * 24; // 24px per level

    return (
      <div key={nodeKey} className="mb-1">
        <div
          className="flex items-center py-2 px-3 rounded-md hover:bg-opacity-50 transition-colors cursor-pointer"
          style={{
            marginLeft: `${indentLevel}px`,
            background: level === 0 ? 'var(--bg-primary, #f8fafc)' : 'transparent',
            borderLeft: level > 0 ? '2px solid var(--border-default, #e2e8f0)' : 'none',
            paddingLeft: level > 0 ? '12px' : '12px'
          }}
          onClick={() => hasChildrenNodes && toggleNode(path)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildrenNodes ? (
            <span
              className="mr-2 flex items-center justify-center"
              style={{
                width: '20px',
                height: '20px',
                color: 'var(--text-secondary, #64748b)',
                fontSize: '12px'
              }}
            >
              {isNodeExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="mr-2" style={{ width: '20px', display: 'inline-block' }}></span>
          )}

          {/* Node Name */}
          <span
            className="font-medium flex-1"
            style={{
              color: 'var(--text-primary, #1e293b)',
              fontSize: level === 0 ? '1rem' : level === 1 ? '0.95rem' : '0.9rem',
              fontWeight: level === 0 ? '600' : level === 1 ? '500' : '400'
            }}
          >
            {node.name || node.competencyName || 'Unknown'}
          </span>

          {/* Assessment Icon - Only show on leaf nodes (no children) */}
          {!hasChildrenNodes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!employeeId) {
                  console.error('[ProfileSkills] Cannot redirect: employeeId is missing');
                  return;
                }
                
                const skillName = node.name || node.competencyName || '';
                
                // Redirect to Assessment with user_id and skill name
                const assessmentUrl = `https://assessment-seven-liard.vercel.app/exam-intro?examType=baseline&userId=${encodeURIComponent(employeeId)}&skillName=${encodeURIComponent(skillName)}`;
                
                console.log('[ProfileSkills] Redirecting to Assessment:', assessmentUrl);
                console.log('[ProfileSkills] Employee ID (UUID):', employeeId);
                console.log('[ProfileSkills] Skill Name:', skillName);
                
                window.location.href = assessmentUrl;
              }}
              className="ml-2 hover:opacity-70 transition-opacity"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Take Assessment for this skill"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                style={{ color: 'var(--text-secondary, #64748b)' }}
              >
                <path 
                  d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Render Children (nested competencies, children, or skills) */}
        {hasChildrenNodes && isNodeExpanded && (
          <div className="mt-1">
            {/* Render nested competencies */}
            {(node.nested_competencies && node.nested_competencies.length > 0) && (
              <div>
                {node.nested_competencies.map((child, idx) =>
                  renderTreeNode(child, [...path, 'nested', idx], level + 1)
                )}
              </div>
            )}
            
            {/* Render children (alternative structure from Skills Engine) */}
            {(node.children && node.children.length > 0) && (
              <div>
                {node.children.map((child, idx) =>
                  renderTreeNode(child, [...path, 'child', idx], level + 1)
                )}
              </div>
            )}

            {/* Render skills (leaf nodes) */}
            {node.skills && node.skills.length > 0 && (
              <div
                style={{
                  marginLeft: `${(level + 1) * 24}px`,
                  paddingLeft: '12px',
                  borderLeft: '2px solid var(--border-default, #e2e8f0)'
                }}
              >
                <div className="flex flex-wrap gap-2 mt-2 mb-3">
                  {node.skills.map((skill, skillIdx) => {
                    // Check if skill is verified based on level field
                    // If level is undefined/null/empty, skill is NOT verified
                    // If level has a value (beginner, intermediate, advanced, etc.), skill IS verified
                    const isVerified = skill.level !== undefined && 
                                      skill.level !== null && 
                                      skill.level !== '' && 
                                      String(skill.level).toLowerCase() !== 'undefined';
                    // Use skill name as-is (no cleaning needed)
                    const skillName = skill.name || '';
                    
                    return (
                      <div
                        key={skillIdx}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                        style={{
                          background: isVerified
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'var(--bg-primary, #f8fafc)',
                          border: `1px solid ${isVerified ? 'rgb(34, 197, 94)' : 'var(--border-default, #e2e8f0)'}`,
                          color: isVerified
                            ? 'rgb(34, 197, 94)'
                            : 'var(--text-secondary, #64748b)',
                          fontWeight: '500'
                        }}
                      >
                        <span>{skillName}</span>
                        
                        {/* Verification Icon */}
                        {isVerified ? (
                          <span 
                            className="ml-1" 
                            title="Verified"
                            style={{ 
                              color: 'rgb(34, 197, 94)',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span 
                            className="ml-1" 
                            title="Not Verified"
                            style={{ 
                              color: 'var(--text-muted, #94a3b8)',
                              fontSize: '12px'
                            }}
                          >
                            ○
                          </span>
                        )}
                        
                        {/* Assessment Icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!employeeId) {
                              console.error('[ProfileSkills] Cannot redirect: employeeId is missing');
                              return;
                            }
                            
                            // Redirect to Assessment with user_id and skill name
                            const assessmentUrl = `https://assessment-seven-liard.vercel.app/exam-intro?examType=baseline&userId=${encodeURIComponent(employeeId)}&skillName=${encodeURIComponent(skillName)}`;
                            
                            console.log('[ProfileSkills] Redirecting to Assessment:', assessmentUrl);
                            console.log('[ProfileSkills] Employee ID (UUID):', employeeId);
                            console.log('[ProfileSkills] Skill Name:', skillName);
                            
                            window.location.href = assessmentUrl;
                          }}
                          className="ml-1 hover:opacity-70 transition-opacity"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Take Assessment"
                        >
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 16 16" 
                            fill="none" 
                            style={{ color: 'var(--text-secondary, #64748b)' }}
                          >
                            <path 
                              d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              fill="none"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Skills
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Loading skills from Skills Engine...
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted, #94a3b8)' }}>
            This may take a moment as Skills Engine processes your profile data.
          </p>
        </div>
      </div>
    );
  }

  if (error && !skillsData) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Skills
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-error, #ef4444)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Handle both flat competencies array and nested_competencies structure
  const competencies = skillsData?.competencies || skillsData?.nested_competencies || [];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Skills
      </h2>
      <div className="p-6 rounded-lg border" style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)'
      }}>
        {/* Skills Tree View */}
        {competencies.length > 0 ? (
          <div className="mb-4">
            {competencies.map((comp, idx) =>
              renderTreeNode(comp, [idx], 0)
            )}
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            No skills data available yet. Skills will be displayed here once processed by Skills Engine.
          </p>
        )}

      </div>
    </div>
  );
}

export default ProfileSkills;
