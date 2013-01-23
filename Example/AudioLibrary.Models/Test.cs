using AudioLibrary.Models.Contract;

namespace AudioLibrary.Models
{
    public class Test : IEntity
    {
        public IViewModel ConvertToModel()
        {
            throw new System.NotImplementedException();
        }

        public void Update(IEntity entity)
        {
            throw new System.NotImplementedException();
        }

        public long Id{get; set;}
    }
}