namespace AudioLibrary.Models.Contract
{
    public interface IViewModel
    {
        long Id { get; set; }
        IEntity ConvertToEntity();
    }
}
