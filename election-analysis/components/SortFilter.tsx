/*
목차:
- SortFilter 컴포넌트 (정렬 필터 드롭다운)
- API 연동 및 콜백 함수 지원
- 다국어 지원 (i18n)
- 접근성 지원
*/

"use client";

import { useTranslation } from 'react-i18next';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { SortAsc } from 'lucide-react';

export type SortOption = 'createdAt' | 'likes' | 'views' | 'comments';
export type SortOrder = 'asc' | 'desc';

interface SortFilterProps {
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortOption, sortOrder: SortOrder) => void;
  className?: string;
}

export default function SortFilter({ 
  sortBy, 
  sortOrder, 
  onSortChange,
  className = ""
}: SortFilterProps) {
  const { t } = useTranslation('common');
  
  const sortOptions = [
    { value: 'createdAt', label: t('sortBy.latest'), defaultOrder: 'desc' as SortOrder },
    { value: 'likes', label: t('sortBy.popular'), defaultOrder: 'desc' as SortOrder },
    { value: 'views', label: t('sortBy.mostViewed'), defaultOrder: 'desc' as SortOrder },
    { value: 'comments', label: t('sortBy.mostComments'), defaultOrder: 'desc' as SortOrder },
  ];
  
  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-') as [SortOption, SortOrder];
    onSortChange(newSortBy, newSortOrder);
  };
  
  const currentValue = `${sortBy}-${sortOrder}`;
  const currentOption = sortOptions.find(option => option.value === sortBy);
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <SortAsc className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {t('sortBy')}
      </span>
      <Select 
        value={currentValue} 
        onValueChange={handleSortChange}
        aria-label={t('sortBy.selectLabel')}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('sortBy.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('sortBy.options')}</SelectLabel>
            {sortOptions.map((option) => (
              <div key={option.value}>
                <SelectItem 
                  value={`${option.value}-desc`}
                  aria-label={`${option.label} (${t('sortBy.descending')})`}
                >
                  {option.label} ↓
                </SelectItem>
                <SelectItem 
                  value={`${option.value}-asc`}
                  aria-label={`${option.label} (${t('sortBy.ascending')})`}
                >
                  {option.label} ↑
                </SelectItem>
              </div>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}